import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useLocalData } from '../contexts/SupabaseContext';
import { Client, Loan, Payment } from '../types';
import { format } from 'date-fns';
import { gerarRecibo } from '../utils/reciboGenerator';
import { getLoanStatus } from '../utils/loanStatus';

export default function LoanDetail() {
  // Estados para forçar exibição de quitação
  const [quitacaoForcada, setQuitacaoForcada] = useState(false);
  const [totalPagoForcado, setTotalPagoForcado] = useState<number | null>(null);
  const [saldoForcado, setSaldoForcado] = useState<number | null>(null);
  // Função para gerar lista de vencimentos recalculada, sempre usando loan.dueDate se existir
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clients, loans, receipts, payments, deleteReceipt, updateLoan, addReceipt, addPayment, refetchLoans } = useLocalData();
  
  const [client, setClient] = useState<Client | null>(null);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isQuitacao, setIsQuitacao] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<number>(1);
  const [paymentAmount, setPaymentAmount] = useState<string>(''); // Inicializa como string vazia
  const [showDeleteReceiptModal, setShowDeleteReceiptModal] = useState<string | null>(null);
  const [showEditDueDate, setShowEditDueDate] = useState(false);
  // newDueDate sempre inicializa do valor persistido em loan.dueDate
  const [newDueDate, setNewDueDate] = useState('');
  useEffect(() => {
    if (loan?.dueDate) {
      setNewDueDate(loan.dueDate.substring(0, 10));
    }
  }, [loan?.dueDate]);
  const [savingDueDate, setSavingDueDate] = useState(false);

  useEffect(() => {
    if (id) {
      const foundLoan = loans.find(l => l.id === id);
      if (foundLoan) {
        setLoan(foundLoan);
        const foundClient = clients.find(c => c.id === foundLoan.clientId);
        if (foundClient) setClient(foundClient);

        // Centraliza a lógica de status usando getLoanStatus
        const newStatus = getLoanStatus(foundLoan, receipts, payments);
        if (newStatus !== foundLoan.status) {
          updateLoan(foundLoan.id, { status: newStatus });
          setLoan({ ...foundLoan, status: newStatus });
        }

        // Sincroniza quitação forçada após atualização/refetch
        // Se o status for 'completed' e o total pago for igual ao total com juros, mantém quitação forçada
        const pagamentosDoEmprestimo = foundLoan.payments || [];
        const recibosDoEmprestimo = receipts.filter(r => r.loanId === foundLoan.id);
        const totalComJuros = ((foundLoan.paymentType === 'diario' || foundLoan.paymentType === 'installments') && foundLoan.installments && foundLoan.installmentAmount)
          ? foundLoan.installments * foundLoan.installmentAmount
          : foundLoan.totalAmount;
        const totalPago = recibosDoEmprestimo.reduce((sum, r) => sum + (r.amount || 0), 0) + pagamentosDoEmprestimo.reduce((sum, p) => sum + (p.amount || 0), 0);
        if (foundLoan.status === 'completed' && Math.abs(totalPago - totalComJuros) < 0.01) {
          setQuitacaoForcada(true);
          setTotalPagoForcado(totalComJuros);
          setSaldoForcado(0);
        } else {
          setQuitacaoForcada(false);
          setTotalPagoForcado(null);
          setSaldoForcado(null);
        }
      }
    }
  }, [id, loans, clients, receipts, payments, updateLoan]);

  const handleViewReceipt = (payment: Payment) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const receiptMessage = `RECIBO DE PAGAMENTO\n\n` +
      `Cliente: ${client?.name}\n` +
      `Data do Pagamento: ${format(new Date(payment.date), 'dd/MM/yyyy')}\n` +
      `Valor Pago: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount)}\n` +
      `--------------------------\n` +
      `Obrigado por utilizar nossos serviços!`;

    alert(receiptMessage);
  };

  // Função para compartilhar recibo via WhatsApp
  function handleSendReceiptWhatsAppFromReceipt(receipt: any) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
    if (!client || !loan) return;
    let telefone = client.phone || '';
    telefone = telefone.replace(/\D/g, '');
    if (telefone.length >= 11 && telefone.startsWith('0')) {
      telefone = telefone.replace(/^0+/, '');
    }
    if (telefone.length === 11) {
      telefone = '55' + telefone;
    }
    if (telefone.length === 13 && telefone.startsWith('55') && telefone[4] === '0') {
      telefone = '55' + telefone.slice(5);
    }
    if (!/^\d{12,13}$/.test(telefone)) {
      alert('Telefone do cliente inválido! Informe no formato 67992825341, 067992825341 ou 5567992825341.');
      return;
    }

    // Descobre a parcela atual e total de parcelas, se aplicável
    let parcelaAtual: number | undefined = undefined;
      {/* Alerta de inconsistência: status concluído mas saldo a receber > 0 */}
      {loan.status === 'completed' && saldoAReceber > 0 && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 rounded">
          <strong>Atenção:</strong> Este empréstimo está marcado como <b>concluído</b>, mas ainda possui saldo a receber de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoAReceber)}. Verifique os recibos, pagamentos ou o valor total do empréstimo.
        </div>
      )}
    let totalParcelas: number | undefined = undefined;
    if (loan.paymentType === 'diario') {
      // Para diário, conta recibos confirmados
      const recibosPagos = receipts.filter(r => r.loanId === loan.id);
      parcelaAtual = recibosPagos.length;
      totalParcelas = loan.installments || loan.numberOfInstallments || 0;
    } else if (loan.installments && loan.installments > 1) {
      // Parcelado tradicional
      const pagamentoRecibo = loan.payments?.find(p => p.id === receipt.paymentId);
      parcelaAtual = pagamentoRecibo?.installmentNumber ?? (receipts.filter(r => r.loanId === loan.id).length);
      totalParcelas = loan.installments;
    }

    // Calcula o total pago confirmado para o recibo
    const recibosDoEmprestimo = receipts.filter(r => r.loanId === loan.id);
    const pagoConfirmado = recibosDoEmprestimo.reduce((sum, r) => sum + (r.amount || 0), 0);

    // Monta a mensagem do recibo conforme modelo solicitado
    let recibo: string;
    if (loan.paymentType === 'interest_only') {
      // Formato personalizado para somente juros
      const dataGeracao = format(new Date(), 'dd/MM/yyyy HH:mm');
      recibo = `RECIBO DE PAGAMENTO - Doc Nº ${receipt.receiptNumber}\n\n` +
        `Cliente: ${client.name}\n` +
        `Vencimento: ${loan.dueDate ? format(new Date(loan.dueDate + 'T00:00:00'), 'dd/MM/yyyy') : '-'}\n` +
        `Data de pagamento: ${receipt.date ? format(new Date(receipt.date), 'dd/MM/yyyy') : '-'}\n` +
        `Valor pago hoje: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receipt.amount)}\n` +
        `--------------------------\n\n` +
        `Gerado em: ${dataGeracao}\n\n` +
        `ATENÇÃO:\nOs dados acima informados são apenas para simples conferência e não servem como comprovante de pagamento.`;
    } else {
      const reciboData = {
        docNumero: receipt.receiptNumber,
        cliente: client.name,
        vencimento: loan.dueDate ? format(new Date(loan.dueDate + 'T00:00:00'), 'dd/MM/yyyy') : '-',
        valorPagoHoje: receipt.amount,
        parcelaAtual,
        totalParcelas,
        dataGeracao: new Date(),
        dataPagamento: receipt.date ? new Date(receipt.date) : new Date(),
        pagoConfirmado: pagoConfirmado,
      };
      recibo = gerarRecibo(reciboData);
    }
    const link = `https://wa.me/${telefone}?text=${encodeURIComponent(recibo)}`;
    window.open(link, '_blank', 'noopener,noreferrer');
  }

  const handleSendReceiptWhatsApp = (payment: Payment) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // Busca o telefone do cliente diretamente da lista de clientes pelo id SEMPRE
    let telefone = '';
    if (client?.id) {
      const found = clients.find(c => c.id === client.id);
      telefone = found?.phone || '';
    }
    telefone = telefone.replace(/\D/g, '');
    if (telefone.length >= 11 && telefone.startsWith('0')) {
      telefone = telefone.replace(/^0+/, '');
    }
    if (telefone.length === 11) {
      telefone = '55' + telefone;
    }
    if (telefone.length === 13 && telefone.startsWith('55') && telefone[4] === '0') {
      telefone = '55' + telefone.slice(5);
    }
    if (!/^\d{12,13}$/.test(telefone)) {
      alert('Telefone do cliente inválido! Informe no formato 67992825341, 067992825341 ou 5567992825341.');
      return;
    }

    if (!loan || !client) return;
    // Corrigido: considera todos os pagamentos confirmados
    const pagamentos = loan.payments || [];
    const parcelaAtual = pagamentos.length;
    const totalParcelas = loan.installments;
    const pagoConfirmado = pagamentos.reduce((sum, p) => sum + p.amount, 0);
    const recibo = gerarRecibo({
      docNumero: loan.id.slice(-4),
      cliente: client.name,
      vencimento: loan.dueDate ? format(new Date(loan.dueDate + 'T00:00:00'), 'dd/MM/yyyy') : '-',
      valorPagoHoje: payment.amount,
      parcelaAtual,
      totalParcelas,
      pagoConfirmado,
      dataGeracao: new Date(),
      dataPagamento: payment.date ? new Date(payment.date) : new Date(), // Corrigido para usar a data do pagamento
    });

    const link = `https://wa.me/${telefone}?text=${encodeURIComponent(recibo)}`;
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  // Remover variáveis não utilizadas para evitar avisos
  // const handleDeletePayment = async (paymentId: string) => {
  //   if (!loan) return;

  //   if (window.confirm('Tem certeza que deseja excluir este pagamento? Esta ação não pode ser desfeita.')) {
  //     try {
  //       const updatedPayments = loan.payments?.filter((p) => p.id !== paymentId) || [];
  //       await updateLoan(loan.id, { payments: updatedPayments });
  //       setLoan({ ...loan, payments: updatedPayments });
  //       alert('Pagamento excluído com sucesso!');
  //     } catch (error) {
  //       console.error('Erro ao excluir pagamento:', error);
  //       alert('Erro ao excluir pagamento. Tente novamente mais tarde.');
  //     }
  //   }
  // };

  // Função para alterar a data de vencimento e reativar o empréstimo
  const handleSaveDueDate = async () => {
    if (!loan || !newDueDate) return;
    setSavingDueDate(true);
    try {
      // Salva exatamente a data escolhida pelo usuário, sem manipulação de fuso nem toISOString
      const result = await updateLoan(loan.id, { dueDate: newDueDate, status: 'active' });
      if (result) {
        setLoan(prev => prev ? { ...prev, dueDate: newDueDate, status: 'active' } : prev);
        setShowEditDueDate(false);
        if (refetchLoans) {
          await refetchLoans();
        }
      }
    } catch (e) {
      alert('Erro ao atualizar vencimento!');
    }
    setSavingDueDate(false);
  };

  // Função para registrar pagamento
  const handlePayment = async () => {
    if (!loan) return;
    if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      alert('Informe um valor válido para o pagamento.');
      return;
    }
    let amount = Number(paymentAmount);
    let paymentType: 'full' | 'interest_only' = 'full';
    // Não altera mais o dueDate automaticamente ao registrar pagamento
    let statusForcado: 'active' | 'completed' | undefined = undefined;
    // Se for quitação manual, força status para concluído em qualquer modalidade
    if (isQuitacao && loan.status === 'active') {
      statusForcado = 'completed';
    }
    const paymentToSave = {
      loanId: loan.id,
      amount,
      date: new Date().toISOString(),
      type: paymentType,
      installmentNumber: selectedInstallment || 1,
    };
    const savedPayment = await addPayment(paymentToSave);
    if (!savedPayment) {
      alert('Erro ao registrar pagamento!');
      return;
    }
    const receiptToSave = {
      loanId: loan.id,
      clientId: loan.clientId,
      paymentId: savedPayment.id,
      amount: savedPayment.amount,
      date: savedPayment.date,
      dueDate: loan.dueDate || new Date().toISOString().slice(0, 10),
      receiptNumber: `REC-${Date.now().toString().slice(-4)}${loan.id.slice(-4)}`,
    };
    const savedReceipt = await addReceipt(receiptToSave);
    if (!savedReceipt) {
      alert('Erro ao registrar recibo!');
      return;
    }
    const updatedPayments = [...(loan.payments || []), savedPayment];
    const updatedReceipts = [...receipts, savedReceipt];
    const totalRecebido = [
      ...updatedReceipts.filter((r) => r.loanId === loan.id).map((r) => r.amount || 0),
      ...updatedPayments.filter((p) => p.loanId === loan.id).map((p) => p.amount || 0)
    ].reduce((sum, value) => sum + value, 0);
    let newStatus = getLoanStatus(loan, updatedReceipts, updatedPayments);
    // Se for quitação, força status para concluído e total pago igual ao total com juros
    let totalPagoFinal = totalRecebido;
    if (isQuitacao) {
      newStatus = 'completed';
      totalPagoFinal = loan.paymentType === 'diario' || loan.paymentType === 'installments'
        ? (loan.installments && loan.installmentAmount ? loan.installments * loan.installmentAmount : loan.totalAmount)
        : loan.totalAmount;
      setQuitacaoForcada(true);
      setTotalPagoForcado(totalPagoFinal);
      setSaldoForcado(0);
    } else if (statusForcado !== undefined) {
      newStatus = statusForcado;
      setQuitacaoForcada(false);
      setTotalPagoForcado(null);
      setSaldoForcado(null);
    } else {
      setQuitacaoForcada(false);
      setTotalPagoForcado(null);
      setSaldoForcado(null);
    }
    await updateLoan(loan.id, { status: newStatus });
    setLoan({
      ...loan,
      payments: updatedPayments,
      status: newStatus
    });
    setPaymentAmount('');
    setIsQuitacao(false);
    if (refetchLoans) refetchLoans();
  };

  if (!loan || !client) {
    return <div className="p-4 text-center">Carregando...</div>;
  }
  // Cálculo correto do total pago, saldo a receber e parcelas pagas
  const recibosDoEmprestimo = receipts.filter(r => loan && r.loanId === loan.id);
  const pagamentosDoEmprestimo = loan.payments || [];
  // Se foi quitação, força total pago igual ao total com juros
  const totalPagoConfirmado = quitacaoForcada && totalPagoForcado !== null
    ? totalPagoForcado
    : recibosDoEmprestimo.reduce((sum, r) => sum + (r.amount || 0), 0) + pagamentosDoEmprestimo.reduce((sum, p) => sum + (p.amount || 0), 0);
  const parcelasPagas = recibosDoEmprestimo.length;

  // Ajuste: saldo a receber por modalidade (considerando recibos + pagamentos)
  let saldoAReceber = 0;
  const totalComJuros = ((loan.paymentType === 'diario' || loan.paymentType === 'installments') && loan.installments && loan.installmentAmount)
    ? loan.installments * loan.installmentAmount
    : loan.totalAmount;
  // Se foi quitação, força saldo a receber para zero
  if (quitacaoForcada && saldoForcado !== null) {
    saldoAReceber = saldoForcado;
  } else if (loan.paymentType === 'interest_only') {
    // Só zera se houver pagamento do tipo 'full'
    const quitado = pagamentosDoEmprestimo.some(p => p.type === 'full');
    saldoAReceber = quitado ? 0 : totalComJuros;
  } else {
    saldoAReceber = Math.max(totalComJuros - totalPagoConfirmado, 0);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/loans')}
            className="text-gray-500 hover:text-gray-700 flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 relative z-10"
          >
            <ArrowLeft size={20} className="mr-1" />
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Empréstimo #{loan.id.slice(-4)}
            <span className={`ml-2 px-2 py-1 text-sm font-semibold rounded-full 
              ${loan.status === 'active' ? 'bg-green-100 text-green-800' : 
                loan.status === 'completed' ? 'bg-blue-100 text-blue-800' : 
                'bg-red-100 text-red-800'}`}
            >
              {loan.status === 'active' ? 'Ativo' : 
                loan.status === 'completed' ? 'Concluído' : 'Atrasado'}
            </span>
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowPaymentModal(true);
              setIsQuitacao(false);
            }}
            className="btn btn-primary"
            disabled={loan.status === 'completed'}
          >
            Registrar Pagamento
          </button>
          {/* Botão para editar vencimento se inadimplente */}
          {loan.status === 'defaulted' && (
            <button
              onClick={() => setShowEditDueDate(true)}
              className="btn btn-warning"
            >
              Alterar Vencimento
            </button>
          )}
        </div>
      </div>

      {/* Lista de vencimentos */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-lg font-medium">Vencimentos</h2>
          <button
            className="btn btn-xs btn-secondary"
            onClick={() => {
              // Calcula a data do próximo vencimento não pago usando a mesma lógica do getVencimentos
              const datas = getVencimentos(loan, receipts);
              const recibosPagos = receipts.filter((r: { loanId: string }) => r.loanId === loan.id);
              let nextDueDate = '';
              let found = false;
              for (let idx = 0; idx < datas.length; idx++) {
                const recibo = recibosPagos[idx];
                if (!recibo) {
                  nextDueDate = datas[idx] instanceof Date ? (datas[idx] as Date).toISOString().slice(0, 10) : String(datas[idx]);
                  found = true;
                  break;
                }
              }
              if (!found && datas.length > 0) {
                // Se todos pagos, pega a última
                nextDueDate = datas[datas.length - 1] instanceof Date ? (datas[datas.length - 1] as Date).toISOString().slice(0, 10) : String(datas[datas.length - 1]);
              }
              setShowEditDueDate(true);
              setNewDueDate(nextDueDate);
            }}
          >
            Editar data de vencimento
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(() => {
            const datas = getVencimentos(loan, receipts);
            const recibosPagos = receipts.filter(r => r.loanId === loan.id);
            const datasPagas = recibosPagos.map(r => r.date ? (new Date(r.date)).toISOString().slice(0,10) : '').filter(Boolean).sort();
            let idxPagamento = 0;
            const hojeStr = new Date().toISOString().slice(0,10);
            return datas.map((data, idx) => {
              let dataObj = data instanceof Date ? data : new Date(data);
              let cor = 'bg-blue-100 text-blue-800';
              const dataStr = dataObj.toISOString().slice(0,10);
              if (idxPagamento < datasPagas.length) {
                cor = 'bg-green-100 text-green-800';
                idxPagamento++;
              } else if (new Date() > dataObj) {
                cor = 'bg-red-100 text-red-800';
              } else if (dataStr === hojeStr) {
                cor = 'bg-yellow-200 text-yellow-900 border border-yellow-400';
              }
              return (
                <span key={idx} className={`px-3 py-1 rounded-full font-semibold ${cor}`}>
                  {dataObj.toLocaleDateString('pt-BR')}
                  {dataStr === hojeStr && ' (Hoje)'}
                </span>
              );
            });
          })()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loan Details */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-medium mb-4">Detalhes do Empréstimo</h2>
          <div className="space-y-4">
            <div>
              <span className="text-gray-500">Cliente:</span>
              <p className="font-medium">{client.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-500">Valor Principal:</span>
                <p className="font-medium">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(loan.amount)}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Total com Juros:</span>
                <p className="font-medium text-blue-700">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    loan.paymentType === 'diario' && loan.installments && loan.installmentAmount
                      ? loan.installments * loan.installmentAmount
                      : loan.totalAmount
                  )}
                </p>
                {loan.paymentType === 'interest_only' && (
                  <div className="mt-1">
                    <span className="text-gray-500">Valor somente juros:</span>
                    <p className="font-medium text-purple-700">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        loan.amount * (loan.interestRate / 100)
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-500">Taxa de Juros:</span>
                <p className="font-medium">{loan.interestRate}% ao mês</p>
              </div>
              {/* Vencimento removido conforme solicitado */}
            </div>
            {/* Valor somente juros agora aparece abaixo de Total com Juros */}
            <div>
              <span className="text-gray-500">Status:</span>
              {(() => {
                // Lógica igual à lista: se houver parcela vencida, mostra Vencido
                let isOverdue = false;
                if (loan.status !== 'completed') {
                  if ((loan.paymentType === 'installments' || loan.paymentType === 'diario') && (loan.installments || loan.numberOfInstallments)) {
                    const totalParcelas = loan.installments || loan.numberOfInstallments || 0;
                    for (let i = 1; i <= totalParcelas; i++) {
                      const dataBase = loan.startDate ? dayjs(loan.startDate) : dayjs(loan.createdAt);
                      let dataVenc = loan.paymentType === 'diario'
                        ? dataBase.add(i, 'day')
                        : dataBase.add(i, 'month');
                      const recibosPagos = receipts ? receipts.filter((r) => r.loanId === loan.id).length : 0;
                      const pago = recibosPagos >= i;
                      if (!pago && dataVenc.isBefore(dayjs(), 'day')) {
                        isOverdue = true;
                        break;
                      }
                    }
                  } else if (loan.paymentType === 'interest_only') {
                    const dataBase = loan.startDate ? dayjs(loan.startDate) : dayjs(loan.createdAt);
                    const meses = receipts ? receipts.filter((r) => r.loanId === loan.id).length + 1 : 1;
                    for (let i = 1; i <= meses; i++) {
                      let dataVenc = dataBase.add(i, 'month');
                      const reciboMes = receipts ? receipts.find(r => r.loanId === loan.id && r.date && dayjs(r.date).isSame(dataVenc, 'month')) : null;
                      if (!reciboMes && dataVenc.isBefore(dayjs(), 'day')) {
                        isOverdue = true;
                        break;
                      }
                    }
                  }
                }
                if (loan.status === 'completed') {
                  return <span className="ml-2 px-2 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">Concluído</span>;
                } else if (isOverdue) {
                  return <span className="ml-2 px-2 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">Vencido</span>;
                } else {
                  return <span className="ml-2 px-2 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">Ativo</span>;
                }
              })()}
            </div>
            <div>
              <span className="text-gray-500">Modalidade:</span>
              <p className="font-medium">
                {loan.paymentType === 'interest_only'
                  ? 'Somente Juros'
                  : loan.paymentType === 'diario'
                  ? 'Diário'
                  : `Parcelado em ${loan.numberOfInstallments || loan.installments || 0}x`}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Parcelas:</span>
              <p className="font-medium">
                {(() => {
                  if (loan.paymentType === 'diario' && loan.payments && loan.payments.length > 0) {
                    // Agrupa pagamentos por valor
                    const pagamentosPorValor: Record<string, number> = {};
                    loan.payments.forEach(p => {
                      const valor = p.amount.toFixed(2);
                      pagamentosPorValor[valor] = (pagamentosPorValor[valor] || 0) + 1;
                    });
                    // Exibe agrupado, ex: '5 x R$ 10,00'
                    return Object.entries(pagamentosPorValor)
                      .map(([valor, qtd]) => `${qtd} x ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor))}`)
                      .join(' + ');
                  }
                  // Padrão para outras modalidades
                  const qtdParcelas = loan.installments || loan.numberOfInstallments;
                  let valorParcela = loan.installmentAmount;
                  if ((!valorParcela || valorParcela === 0) && qtdParcelas) {
                    valorParcela = loan.totalAmount / qtdParcelas;
                  }
                  return qtdParcelas && valorParcela
                    ? `${qtdParcelas} x ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorParcela)}`
                    : '-';
                })()}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Observações:</span>
              <p className="font-medium whitespace-pre-line">{loan.notes || '-'}</p>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-medium mb-4">Resumo Financeiro</h2>
          <div className="space-y-4">
            <div>
              <span className="text-gray-500">Total Pago:</span>
              <p className="text-xl font-semibold text-green-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPagoConfirmado)}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Saldo a Receber:</span>
              <p className="text-xl font-semibold text-purple-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoAReceber)}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Parcelas Pagas:</span>
              <p className="font-medium">
                {parcelasPagas}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de Recibos */}
      <div className="mt-6 bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-medium mb-4">Histórico de Recibos</h2>
        {receipts && receipts.filter(r => r.loanId === loan.id).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                {loan.paymentType === 'interest_only' ? (
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº Recibo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data do Pagamento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor Pago</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº Recibo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(() => {
                  const recibos = receipts.filter(r => r.loanId === loan.id);
                  return recibos.map((receipt) => {
                    if (loan.paymentType === 'interest_only') {
                      return (
                        <tr key={receipt.id}>
                          <td className="px-6 py-4 whitespace-nowrap font-semibold">{receipt.receiptNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{new Date(receipt.date).toLocaleDateString('pt-BR')}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-green-700 font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receipt.amount)}</td>
                          <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                            <button
                              onClick={() => {
                                const reciboData = {
                                  docNumero: receipt.receiptNumber,
                                  cliente: client.name,
                                  vencimento: loan.dueDate ? format(new Date(loan.dueDate + 'T00:00:00'), 'dd/MM/yyyy') : '-',
                                  valorPagoHoje: receipt.amount,
                                  dataGeracao: new Date(),
                                  dataPagamento: receipt.date ? new Date(receipt.date) : new Date(),
                                  pagoConfirmado: 0,
                                };
                                const recibo = gerarRecibo(reciboData);
                                alert(recibo);
                              }}
                              className="text-indigo-600 hover:text-indigo-900 mr-1"
                            >
                              Ver Recibo
                            </button>
                            <button
                              onClick={() => handleSendReceiptWhatsAppFromReceipt(receipt)}
                              className="text-green-600 hover:text-green-900"
                            >
                              WhatsApp
                            </button>
                            <button
                              onClick={() => setShowDeleteReceiptModal(receipt.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      );
                    }
                    // Outras modalidades
                    return (
                      <tr key={receipt.id}>
                        <td className="px-6 py-4 whitespace-nowrap">{receipt.receiptNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{new Date(receipt.date).toLocaleDateString('pt-BR')}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receipt.amount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                          <button
                            onClick={() => navigate(`/receipts/${receipt.id}`)}
                            className="text-indigo-600 hover:text-indigo-900 mr-1"
                          >
                            Ver Detalhes
                          </button>
                          <button
                            onClick={() => handleSendReceiptWhatsAppFromReceipt(receipt)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Enviar via WhatsApp
                          </button>
                          <button
                            onClick={() => setShowDeleteReceiptModal(receipt.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500">Nenhum recibo gerado</p>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium mb-4">Registrar Pagamento</h3>
            <div className="space-y-4">
              {loan.paymentType === 'interest_only' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Pagamento
                  </label>
                  <select
                    className="form-select w-full"
                    value={selectedInstallment === 2 ? 'full' : 'interest_only'}
                    onChange={e => setSelectedInstallment(e.target.value === 'full' ? 2 : 1)}
                  >
                    <option value="interest_only">Juros</option>
                    <option value="full">Juros + Capital</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor do Pagamento
                </label>
                <input
                  type="number"
                  className="form-input w-full"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="Digite o valor"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  handlePayment();
                  setShowPaymentModal(false);
                }}
                className="btn btn-primary"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ...existing code... */}

      {/* Delete Receipt Modal */}
      {showDeleteReceiptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-medium">Excluir Recibo</h3>
            </div>
            <p className="text-gray-500 mb-4">
              Tem certeza que deseja excluir este recibo? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteReceiptModal(null)}
                className="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (showDeleteReceiptModal) deleteReceipt(showDeleteReceiptModal);
                  setShowDeleteReceiptModal(null);
                }}
                className="btn btn-danger"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar vencimento */}
      {showEditDueDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium mb-4">Alterar Data de Vencimento</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova Data de Vencimento</label>
              <input
                type="date"
                className="form-input w-full"
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                className="btn btn-secondary"
                onClick={() => setShowEditDueDate(false)}
                disabled={savingDueDate}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveDueDate}
                disabled={savingDueDate || !newDueDate}
              >
                {savingDueDate ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}