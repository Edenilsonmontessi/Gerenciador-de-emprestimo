import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { useNavigate } from 'react-router-dom';
import { useLocalData } from '../contexts/SupabaseContext';
import type { Loan } from '../types';

// Função para gerar lista de vencimentos igual LoanDetail
function getVencimentos(
  loan: Loan,
  receipts: { loanId: string; date?: string; amount?: number }[]
): Date[] {
  let datas: Date[] = [];
  // Usa loan.dueDate como base se existir, senão startDate, senão createdAt
  let dataBase = loan.dueDate ? new Date(loan.dueDate) : (loan.startDate ? new Date(loan.startDate) : (loan.createdAt ? new Date(loan.createdAt) : null));
  if (!dataBase) return [];
  let totalParcelas = loan.installments || loan.numberOfInstallments || 0;
  if (loan.paymentType === 'interest_only') {
    const recibosPagos = receipts.filter(r => r.loanId === loan.id);
    const quitado = (loan.payments || []).some(p => p.type === 'full');
    for (let i = 1; i <= recibosPagos.length + (quitado ? 0 : 1); i++) {
      let d = new Date(dataBase);
      const diaOriginal = d.getDate();
      d.setMonth(d.getMonth() + i);
      if (d.getDate() !== diaOriginal) {
        d.setDate(0);
      }
      datas.push(d);
    }
  } else if (loan.paymentType === 'diario') {
    for (let i = 1; i <= totalParcelas; i++) {
      let d = new Date(dataBase);
      d.setDate(d.getDate() + i);
      datas.push(d);
    }
  } else if (loan.paymentType === 'installments') {
    for (let i = 1; i <= totalParcelas; i++) {
      let d = new Date(dataBase);
      const diaOriginal = d.getDate();
      d.setMonth(d.getMonth() + i);
      if (d.getDate() !== diaOriginal) {
        d.setDate(0);
      }
      datas.push(d);
    }
  }
  return datas;
}

// Função utilitária para atualizar o status do empréstimo
function getUpdatedStatus(newDueDate: string) {
  return dayjs(newDueDate).isAfter(dayjs(), 'day') ? 'active' : 'defaulted';
}

export default function LoanCalendar() {

  console.log('[LoanCalendar] Componente carregado');
  const { loans, clients, receipts, updateLoan, refetchLoans } = useLocalData();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editLoan, setEditLoan] = useState<null | { loan: Loan, parcelaNumero?: number }>(null);
  const [newDueDate, setNewDueDate] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  // Loga sempre que o modal de edição for aberto
  useEffect(() => {
    if (editLoan) {
      console.log('[LoanCalendar] Modal de edição aberto para loanId:', editLoan.loan.id);
    }
  }, [editLoan]);

  // Sempre que loans ou receipts mudarem, força atualização do calendário
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [loans, receipts]);

  // Gera um Set com todas as datas de vencimento reais de todos os empréstimos (usando getVencimentos)
  const loanDueDates = new Set<string>();
  const parcelasPorData: Record<string, Array<{loan: Loan, parcelaNumero?: number}>> = {};
  loans.forEach(loan => {
    // Agora inclui também os concluídos para mostrar no calendário
    // Não marca como atrasado se já estiver concluído
    const isCompleted = loan.status === 'completed';
    const vencimentos = getVencimentos(loan, receipts || []);
    let hasOverdue = false;
    vencimentos.forEach((data, idx) => {
      const dataStr = dayjs(data).format('YYYY-MM-DD');
      loanDueDates.add(dataStr);
      if (!parcelasPorData[dataStr]) parcelasPorData[dataStr] = [];
      // Para parcelado/diário/somente juros, salva o número da parcela
      let parcelaNumero: number | undefined = undefined;
      if (loan.paymentType === 'installments' || loan.paymentType === 'diario' || loan.paymentType === 'interest_only') {
        parcelaNumero = idx + 1;
      }
      parcelasPorData[dataStr].push({ loan, parcelaNumero });
      // Verifica se está vencida e não paga, mas só se não estiver concluído
      if (!isCompleted) {
        if ((loan.paymentType === 'installments' || loan.paymentType === 'diario') && parcelaNumero) {
          const recibosPagos = (receipts || []).filter(r => r.loanId === loan.id);
          const pago = recibosPagos.length >= parcelaNumero;
          if (!pago && dayjs(dataStr).isBefore(dayjs(), 'day')) {
            hasOverdue = true;
          }
        } else if (loan.paymentType === 'interest_only' && parcelaNumero) {
          const vencimentos = getVencimentos(loan, receipts || []);
          const dataVenc = vencimentos[parcelaNumero - 1];
          if (dataVenc) {
            const dataVencStr = dayjs(dataVenc).format('YYYY-MM-DD');
            const reciboPago = (receipts || []).some(r => r.loanId === loan.id && r.date && dayjs(r.date).format('YYYY-MM-DD') === dataVencStr);
            if (!reciboPago && dayjs(dataVencStr).isBefore(dayjs(), 'day')) {
              hasOverdue = true;
            }
          }
        }
      }
    });
    // Atualiza status para 'defaulted' se houver vencida não paga
    if (hasOverdue && loan.status !== 'defaulted' && updateLoan) {
      updateLoan(loan.id, { status: 'defaulted' });
    }
  });

  // Para o dia selecionado, pega todos os empréstimos/parcelas que vencem nesse dia
  const loansForDay = selectedDate
    ? (parcelasPorData[dayjs(selectedDate).format('YYYY-MM-DD')] || [])
    : [];

  // Soma o valor correto devido do dia: parcela, valor diário ou juros do dia
  const totalDoDia = loansForDay.reduce((acc, item) => {
    const loan = item.loan;
    const parcelaNumero = item.parcelaNumero;
    // Parcelado: valor da parcela
    if (loan.paymentType === 'installments' && loan.installmentAmount) {
      return acc + loan.installmentAmount;
    }
    // Diário: valor diário
    if (loan.paymentType === 'diario' && loan.installmentAmount) {
      return acc + loan.installmentAmount;
    }
    // Somente juros: calcular juros simples do dia
    if (loan.paymentType === 'interest_only' && loan.amount) {
      let taxa = 0;
      if (typeof loan.interestRate === 'number') {
        taxa = loan.interestRate;
      } else if (typeof loan.interestRate === 'string') {
        const match = (loan.interestRate as string).match(/([\d,.]+)/);
        if (match) taxa = parseFloat(match[1].replace(',', '.'));
      }
      const jurosSimples = loan.amount && taxa ? loan.amount * (taxa / 100) : 0;
      return acc + jurosSimples;
    }
    // Fallback: valor da parcela ou valor total
    if (loan.installmentAmount) {
      return acc + loan.installmentAmount;
    }
    if (loan.amount) {
      return acc + loan.amount;
    }
    return acc;
  }, 0);

  // Função para buscar nome do cliente pelo clientId
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : clientId;
  };

  // (Removido: já declarado acima)

  // Função utilitária para calcular juros simples para exibir no detalhe
  function renderJurosSimplesDetalhe(loan: Loan) {
    if (loan.paymentType !== 'interest_only' || !loan.amount) return null;
    const taxa = typeof loan.interestRate === 'number' ? loan.interestRate : 0;
    const jurosSimples = loan.amount && taxa ? loan.amount * (taxa / 100) : 0;
    return (
      <div className="text-sm text-blue-800 mt-1">
        Valor somente juros: <b>{jurosSimples.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b>
      </div>
    );
  }

  return (
    <div className="mb-8" key={refreshKey}>
      <h2 className="text-xl font-bold mb-2">Filtrar por Data de Vencimento</h2>
      <Calendar
        onChange={date => setSelectedDate(date as Date)}
        value={selectedDate}
        locale="pt-BR"
        formatShortWeekday={(_locale, date) => {
          // Ordem correta: Dom, Seg, Ter, Qua, Qui, Sex, Sáb
          const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
          return dias[date.getDay()];
        }}
        formatMonthYear={(_, date) => dayjs(date).locale('pt-br').format('MMMM [de] YYYY')}
        formatMonth={(_, date) => dayjs(date).locale('pt-br').format('MMMM')}
        tileClassName={({ date, view }) => {
          if (view === 'month') {
            const dateStr = dayjs(date).format('YYYY-MM-DD');
            if (loanDueDates.has(dateStr)) {
              const loansForThisDay = parcelasPorData[dateStr] || [];
              // Usa a mesma lógica da lista detalhada para determinar cor
              let algumQuitado = false;
              let algumAtrasado = false;
              loansForThisDay.forEach(({ loan, parcelaNumero }) => {
                // Não marca como atrasado se já estiver concluído
                const isCompleted = loan.status === 'completed';
                // Descobre a data da parcela/diária
                let dataParcela: Date | null = null;
                if ((loan.paymentType === 'installments' || loan.paymentType === 'diario') && parcelaNumero) {
                  const vencimentos = getVencimentos(loan, receipts || []);
                  dataParcela = vencimentos[parcelaNumero - 1] || null;
                } else if (loan.paymentType === 'interest_only') {
                  const vencimentos = getVencimentos(loan, receipts || []);
                  dataParcela = vencimentos[0] || null;
                }
                // Verifica se está quitado
                let quitado = false;
                if (isCompleted) {
                  quitado = true;
                } else if (dataParcela) {
                  const dataVenc = dayjs(dataParcela).startOf('day');
                  let reciboPago = false;
                  if ((loan.paymentType === 'installments' || loan.paymentType === 'diario') && parcelaNumero) {
                    const recibosPagos = (receipts || []).filter(r => r.loanId === loan.id);
                    reciboPago = !!recibosPagos[parcelaNumero - 1];
                  } else if (loan.paymentType === 'interest_only') {
                    const recibosPagos = (receipts || []).filter(r => r.loanId === loan.id && r.date && dayjs(r.date).isSame(dataVenc, 'day'));
                    reciboPago = recibosPagos.length > 0;
                  }
                  quitado = reciboPago;
                }
                if (quitado) algumQuitado = true;
                // Verifica se está atrasado
                if (!quitado && !isCompleted && dataParcela) {
                  const hoje = dayjs().startOf('day');
                  const dataVenc = dayjs(dataParcela).startOf('day');
                  if (dataVenc.isBefore(hoje)) {
                    algumAtrasado = true;
                  }
                }
              });
              if (algumQuitado) return 'react-calendar__tile--paid-loan';
              if (algumAtrasado) return 'react-calendar__tile--overdue-loan';
              return 'react-calendar__tile--has-loan';
            }
          }
          return undefined;
        }}
      />
      {/* Adiciona estilo customizado para destacar os dias com empréstimo */}
      <style>{`
        .react-calendar__tile--has-loan {
          background: #2563eb !important;
          color: #fff !important;
          border-radius: 50%;
        }
        .react-calendar__tile--has-loan:enabled:hover, .react-calendar__tile--has-loan:enabled:focus {
          background: #1d4ed8 !important;
        }
        .react-calendar__tile--overdue-loan {
          background: #dc2626 !important;
          color: #fff !important;
          border-radius: 50%;
        }
        .react-calendar__tile--overdue-loan:enabled:hover, .react-calendar__tile--overdue-loan:enabled:focus {
          background: #b91c1c !important;
        }
        .react-calendar__tile--paid-loan {
          background: #22c55e !important;
          color: #fff !important;
          border-radius: 50%;
        }
        .react-calendar__tile--paid-loan:enabled:hover, .react-calendar__tile--paid-loan:enabled:focus {
          background: #16a34a !important;
        }
      `}</style>
      {selectedDate && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">
            Valor total devido em {dayjs(selectedDate).format('DD/MM/YYYY')}: <span className="text-blue-700">{totalDoDia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </h3>
          {loansForDay.length > 0 && (
            <ul className="space-y-2">
              {loansForDay.map(({ loan, parcelaNumero }) => {
                let totalParcelas = loan.installments || loan.numberOfInstallments || 0;
                let idxParcela = parcelaNumero || 1;
                // Descobre a data da parcela/diária
                let dataParcela: Date | null = null;
                if ((loan.paymentType === 'installments' || loan.paymentType === 'diario') && parcelaNumero) {
                  const vencimentos = getVencimentos(loan, receipts || []);
                  dataParcela = vencimentos[parcelaNumero - 1] || null;
                } else if (loan.paymentType === 'interest_only' && parcelaNumero) {
                  const vencimentos = getVencimentos(loan, receipts || []);
                  dataParcela = vencimentos[parcelaNumero - 1] || null;
                }
                // Label para hoje
                let labelHoje = '';
                if (dataParcela && dayjs(dataParcela).startOf('day').isSame(dayjs().startOf('day'))) {
                  labelHoje = ' (Hoje)';
                }
                // Não marca como atrasado se já estiver concluído
                const isCompleted = loan.status === 'completed';
                // Lógica idêntica ao calendário para quitado/atrasado
                let quitado = false;
                let atrasado = false;
                if (isCompleted) {
                  quitado = true;
                } else if (dataParcela && parcelaNumero) {
                  const dataVenc = dayjs(dataParcela).startOf('day');
                  let reciboPago = false;
                  if ((loan.paymentType === 'installments' || loan.paymentType === 'diario') && parcelaNumero) {
                    const recibosPagos = (receipts || []).filter(r => r.loanId === loan.id);
                    reciboPago = !!recibosPagos[parcelaNumero - 1];
                  } else if (loan.paymentType === 'interest_only' && parcelaNumero) {
                    // Considera quitado se o número de recibos for igual ou maior ao número da parcela/juros
                    const recibosPagos = (receipts || []).filter(r => r.loanId === loan.id);
                    reciboPago = recibosPagos.length >= parcelaNumero;
                  }
                  quitado = reciboPago;
                  const hoje = dayjs().startOf('day');
                  atrasado = !reciboPago && !isCompleted && dataVenc.isBefore(hoje);
                }

                // Cálculo do valor do pagamento de juros para modalidade somente juros
                let jurosSimples = 0;
                if (loan.paymentType === 'interest_only') {
                  const taxa = typeof loan.interestRate === 'number' ? loan.interestRate : 0;
                  jurosSimples = loan.amount && taxa ? loan.amount * (taxa / 100) : 0;
                }

                return (
                  <li key={loan.id + (parcelaNumero ? `-parcela${parcelaNumero}` : '')}>
                    <button
                      className={
                        (quitado ? 'text-green-600 font-bold ' : atrasado ? 'text-red-600 font-bold ' : 'text-blue-600 ') +
                        'hover:underline'
                      }
                      onClick={() => {
                        if (atrasado) {
                          setEditLoan({ loan, parcelaNumero });
                          setNewDueDate('');
                        } else {
                          navigate(`/loans/${loan.id}`);
                        }
                      }}
                    >
                      {getClientName(loan.clientId)}
                      {loan.paymentType === 'installments' && parcelaNumero ?
                        ` - Parcela ${idxParcela}/${totalParcelas}: ${(loan.installmentAmount || loan.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` :
                        loan.paymentType === 'diario' && parcelaNumero ?
                          ` - Valor diário: ${(loan.installmentAmount || loan.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` :
                          loan.paymentType === 'interest_only' ?
                            ` - Valor juros: ${jurosSimples.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` :
                            ` - Valor: ${(loan.totalAmount || loan.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                      }
                      {labelHoje}
                      {quitado && ' (Pago)'}
                      {atrasado && ' (Atrasado)'}
                    </button>
                    {/* Exibe valor somente juros abaixo de Parcelas, se for somente juros */}
                    {loan.paymentType === 'interest_only' && (
                      renderJurosSimplesDetalhe(loan)
                    )}
                  </li>
                );
              })}
      {/* Modal para alterar data de vencimento */}
      {editLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h4 className="font-bold mb-2">Alterar Data de Vencimento</h4>
            <p className="mb-2">Cliente: <b>{getClientName(editLoan.loan.clientId)}</b></p>
            <input
              type="date"
              className="border p-2 rounded w-full mb-4"
              value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded"
                onClick={async () => {
                  if (!editLoan) {
                    console.log('[LoanCalendar][SALVAR] editLoan está null, abortando.');
                    return;
                  }
                  const { loan } = editLoan;
                  let dueDateISO = newDueDate;
                  if (/^\d{4}-\d{2}-\d{2}$/.test(newDueDate)) {
                    dueDateISO = newDueDate;
                  }
                  // Descobrir a primeira parcela NÃO quitada
                  let primeiraNaoPaga = 0;
                  if (loan.paymentType === 'installments' || loan.paymentType === 'diario' || loan.paymentType === 'interest_only') {
                    const vencimentos = getVencimentos(loan, receipts || []);
                    for (let i = 0; i < vencimentos.length; i++) {
                      let quitada = false;
                      if (loan.paymentType === 'interest_only') {
                        const dataVencStr = dayjs(vencimentos[i]).format('YYYY-MM-DD');
                        quitada = (receipts || []).some(r => r.loanId === loan.id && r.date && dayjs(r.date).format('YYYY-MM-DD') === dataVencStr);
                      } else {
                        const recibosPagos = (receipts || []).filter(r => r.loanId === loan.id);
                        quitada = recibosPagos.length > i;
                      }
                      if (!quitada) {
                        primeiraNaoPaga = i;
                        break;
                      }
                    }
                  }
                  // Atualiza a dueDate para a data da primeira parcela não paga
                  let novaDueDate = dueDateISO;
                  if (primeiraNaoPaga > 0 && (loan.paymentType === 'installments' || loan.paymentType === 'diario' || loan.paymentType === 'interest_only')) {
                    // Calcula a nova dueDate "voltando" o número de parcelas já pagas (NÃO subtrai se for a primeira não paga)
                    let data = dayjs(dueDateISO);
                    if (primeiraNaoPaga > 0) {
                      if (loan.paymentType === 'diario') {
                        data = data.subtract(primeiraNaoPaga, 'day');
                      } else {
                        data = data.subtract(primeiraNaoPaga, 'month');
                      }
                    }
                    novaDueDate = data.format('YYYY-MM-DD');
                  }
                  console.log('[LoanCalendar][SALVAR] Tentando salvar data:', {
                    loanId: loan.id,
                    clientId: loan.clientId,
                    oldDueDate: loan.dueDate,
                    newDueDate: novaDueDate,
                    status: getUpdatedStatus(novaDueDate),
                  });
                  if (typeof updateLoan === 'function') {
                    try {
                      const result = await updateLoan(loan.id, { dueDate: novaDueDate, status: getUpdatedStatus(novaDueDate) });
                      console.log('[LoanCalendar][SALVAR] updateLoan resultado:', result);
                      if (typeof refetchLoans === 'function') {
                        await refetchLoans();
                      }
                    } catch (err) {
                      console.error('[LoanCalendar][SALVAR] Erro ao salvar no updateLoan:', err);
                    }
                  } else {
                    console.warn('[LoanCalendar][SALVAR] updateLoan não é uma função!');
                  }
                  setEditLoan(null);
                }}
                disabled={!newDueDate}
              >Salvar</button>
              <button
                className="bg-gray-300 px-4 py-2 rounded"
                onClick={() => setEditLoan(null)}
              >Cancelar</button>
            </div>
          </div>
        </div>
      )}
            </ul>
          )}
          {loansForDay.length === 0 && <p className="text-gray-500">Nenhum empréstimo com vencimento nesta data.</p>}
        </div>
      )}
    </div>
  );
}
