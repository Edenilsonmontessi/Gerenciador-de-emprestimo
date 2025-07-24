import dayjs from 'dayjs';
  // Função para saber se um empréstimo está inadimplente (vencido)
  function isOverdue(loan: any): boolean {
    if (loan.status !== 'active') return false;
    if (loan.paymentType === 'diario') {
      const start = loan.startDate ? dayjs(loan.startDate) : dayjs(loan.createdAt);
      const hoje = dayjs();
      const diasDecorridos = hoje.diff(start, 'day') + 1;
      const pagos = loan.payments ? loan.payments.length : 0;
      const total = loan.installments || loan.numberOfInstallments || 0;
      if (diasDecorridos > 0 && pagos === 0) return true;
      return pagos < Math.min(diasDecorridos, total);
    } else {
      const hoje = dayjs();
      return !!loan.dueDate && hoje.isAfter(dayjs(loan.dueDate));
    }
  }
import { useState } from 'react';
import { getLoanStatus } from '../utils/loanStatus';
import { Receipt } from '../types';
import { Plus, Search, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocalData } from '../contexts/SupabaseContext';

export default function Loans() {
  const { loans, clients, payments, receipts, deleteLoanCascade } = useLocalData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedLoans, setSelectedLoans] = useState<string[]>([]);

  // Get client name by ID
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Cliente desconhecido';
  };

  // Adiciona os pagamentos em cada loan
  const loansWithPayments = loans.map(loan => {
    const loanPayments = payments.filter(p => p.loanId === loan.id);
    const loanReceipts = receipts ? receipts.filter((r: Receipt) => r.loanId === loan.id) : [];
    // Lógica para status visual: vencido se houver parcela vencida não paga
    let isOverdue = false;
    if (loan.status !== 'completed') {
      // Para parcelado/diário
      if ((loan.paymentType === 'installments' || loan.paymentType === 'diario') && (loan.installments || loan.numberOfInstallments)) {
        const totalParcelas = loan.installments || loan.numberOfInstallments || 0;
        for (let i = 1; i <= totalParcelas; i++) {
          const dataBase = loan.startDate ? dayjs(loan.startDate) : dayjs(loan.createdAt);
          let dataVenc = loan.paymentType === 'diario'
            ? dataBase.add(i, 'day')
            : dataBase.add(i, 'month');
          const recibosPagos = loanReceipts.length;
          const pago = recibosPagos >= i;
          if (!pago && dataVenc.isBefore(dayjs(), 'day')) {
            isOverdue = true;
            break;
          }
        }
      } else if (loan.paymentType === 'interest_only') {
        // Para juros, vencido se não houver recibo para o mês vencido
        const dataBase = loan.startDate ? dayjs(loan.startDate) : dayjs(loan.createdAt);
        const meses = loanReceipts.length + 1;
        for (let i = 1; i <= meses; i++) {
          let dataVenc = dataBase.add(i, 'month');
          const reciboMes = loanReceipts.find(r => r.date && dayjs(r.date).isSame(dataVenc, 'month'));
          if (!reciboMes && dataVenc.isBefore(dayjs(), 'day')) {
            isOverdue = true;
            break;
          }
        }
      }
    }
    return {
      ...loan,
      payments: loanPayments,
      receipts: loanReceipts,
      _isOverdue: isOverdue
    };
  });

  // Filter loans by search term and status (usando getLoanStatus para garantir consistência)
  const filteredLoans = loansWithPayments.filter(loan => {
    const clientName = getClientName(loan.clientId).toLowerCase();
    const matchesSearch = clientName.includes(searchTerm.toLowerCase());
    const status = getLoanStatus(loan, loan.receipts, loan.payments);
    // Para filtro visual, considera vencido se _isOverdue
    if (filterStatus === 'all') {
      return matchesSearch;
    }
    if (filterStatus === 'active') {
      return matchesSearch && status === 'active' && !loan._isOverdue;
    }
    if (filterStatus === 'completed') {
      return matchesSearch && status === 'completed';
    }
    if (filterStatus === 'defaulted' || filterStatus === 'inadimplente' || filterStatus === 'inadimplentes') {
      return matchesSearch && loan._isOverdue;
    }
    return matchesSearch;
  });

  // Handle loan deletion
  const handleDeleteLoan = (loanId: string) => {
    if (window.confirm('Tem certeza que deseja apagar este empréstimo? Esta ação não pode ser desfeita.')) {
      deleteLoanCascade(loanId)
        .then(() => {
          alert('Empréstimo apagado com sucesso!');
        })
        .catch((error) => {
          console.error('Erro ao apagar o empréstimo:', error);
          alert('Erro ao apagar o empréstimo. Tente novamente mais tarde.');
        });
    }
  };

  // Seleção de empréstimos
  const toggleSelectLoan = (loanId: string) => {
    setSelectedLoans((prev) =>
      prev.includes(loanId) ? prev.filter(id => id !== loanId) : [...prev, loanId]
    );
  };
  const selectAll = () => {
    setSelectedLoans(filteredLoans.map(l => l.id));
  };
  const deselectAll = () => {
    setSelectedLoans([]);
  };

  // Exclusão múltipla
  const handleDeleteSelected = async () => {
    if (selectedLoans.length === 0) return;
    if (window.confirm(`Tem certeza que deseja apagar ${selectedLoans.length} empréstimo(s)? Esta ação não pode ser desfeita.`)) {
      for (const loanId of selectedLoans) {
        await deleteLoanCascade(loanId);
      }
      alert('Empréstimos apagados com sucesso!');
      setSelectedLoans([]);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Empréstimos</h1>
        <Link 
          to="/loans/add" 
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> Novo Empréstimo
        </Link>
      </div>

      {/* Botão de exclusão múltipla */}
      {selectedLoans.length > 0 && (
        <div className="mb-4 flex gap-2 items-center">
          <button onClick={handleDeleteSelected} className="btn btn-danger">
            Excluir Selecionados ({selectedLoans.length})
          </button>
          <button onClick={deselectAll} className="btn btn-secondary text-xs">Limpar Seleção</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="form-input pl-10 py-3"
              placeholder="Buscar por cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div>
          <select
            className="form-input py-3"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativos</option>
            <option value="completed">Concluídos</option>
            <option value="defaulted">Inadimplentes</option>
          </select>
        </div>
      </div>

      {/* Loan list */}
      {filteredLoans.length > 0 ? (
        <div className="overflow-x-auto bg-white shadow-sm rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedLoans.length === filteredLoans.length && filteredLoans.length > 0}
                    onChange={e => e.target.checked ? selectAll() : deselectAll()}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Parcelas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Início
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Modalidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLoans.map((loan) => (
                <tr key={loan.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedLoans.includes(loan.id)}
                      onChange={() => toggleSelectLoan(loan.id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{getClientName(loan.clientId)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(loan.amount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        loan.paymentType === 'diario' && loan.installments && loan.installmentAmount
                          ? loan.installments * loan.installmentAmount
                          : loan.totalAmount
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {(loan.installments || loan.numberOfInstallments) ? `${loan.installments || loan.numberOfInstallments}x` : '-'}
                      {loan.installmentAmount ? ` de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(loan.installmentAmount)}` : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {(() => {
                        const pagamentosFeitos = loan.receipts ? loan.receipts.length : 0;
                        const totalParcelas = loan.installments || loan.numberOfInstallments || 0;
                        const dataInicio = loan.startDate ? new Date(loan.startDate) : (loan.createdAt ? new Date(loan.createdAt) : null);
                        if (!dataInicio) return '-';
                        let proximoVencimento = new Date(dataInicio);
                        if (loan.paymentType === 'diario') {
                          proximoVencimento.setDate(proximoVencimento.getDate() + pagamentosFeitos * 1);
                        } else if (loan.paymentType === 'installments' || loan.paymentType === 'interest_only') {
                          // Mantém o mesmo dia do mês, ou último dia se não existir
                          const diaOriginal = proximoVencimento.getDate();
                          proximoVencimento.setMonth(proximoVencimento.getMonth() + pagamentosFeitos);
                          // Se o mês mudou e o dia mudou, ajusta para último dia do mês
                          if (proximoVencimento.getDate() !== diaOriginal) {
                            proximoVencimento.setDate(0); // 0 = último dia do mês anterior, então setMonth já está no mês correto
                          }
                        }
                        // Se já quitou tudo, mostra último vencimento
                        if (pagamentosFeitos >= totalParcelas && totalParcelas > 0) {
                          if (loan.paymentType === 'diario') {
                            proximoVencimento = new Date(dataInicio);
                            proximoVencimento.setDate(proximoVencimento.getDate() + ((totalParcelas - 1) * 1));
                          } else {
                            const diaOriginal = proximoVencimento.getDate();
                            proximoVencimento = new Date(dataInicio);
                            proximoVencimento.setMonth(proximoVencimento.getMonth() + (totalParcelas - 1));
                            if (proximoVencimento.getDate() !== diaOriginal) {
                              proximoVencimento.setDate(0);
                            }
                          }
                        }
                        return proximoVencimento.toLocaleDateString('pt-BR');
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {loan.paymentType === 'diario' ? 'Diário' : loan.paymentType === 'installments' ? 'Parcelado' : loan.paymentType === 'interest_only' ? 'Somente Juros' : 'Outro'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      let statusLabel = 'Ativo';
                      let statusClass = 'bg-green-100 text-green-800';
                      if (getLoanStatus(loan, loan.receipts, loan.payments) === 'completed') {
                        statusLabel = 'Concluído';
                        statusClass = 'bg-blue-100 text-blue-800';
                      } else if (loan._isOverdue) {
                        statusLabel = 'Vencido';
                        statusClass = 'bg-red-100 text-red-800';
                      }
                      return (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                          {statusLabel}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">

                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Link to={`/loans/${loan.id}`} className="text-indigo-600 hover:text-indigo-900">
                      Detalhes
                    </Link>
                    <button
                      onClick={() => handleDeleteLoan(loan.id)}
                      className="text-red-600 hover:text-red-900 ml-4"
                    >
                      Apagar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg p-12 text-center">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum empréstimo encontrado</h3>
          <p className="mt-2 text-gray-500">
            {searchTerm || filterStatus !== 'all' ? 'Nenhum resultado encontrado para os filtros aplicados.' : 'Comece adicionando um novo empréstimo.'}
          </p>
          {!searchTerm && filterStatus === 'all' && (
            <div className="mt-6">
              <Link to="/loans/add" className="btn btn-primary inline-flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                Novo Empréstimo
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}