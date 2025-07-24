import { Users, CreditCard, TrendingUp, Receipt, Plus } from 'lucide-react';
import StatCard from '../components/StatCard';
import { Link } from 'react-router-dom';
import { useLocalData } from '../contexts/SupabaseContext';
import { useMemo, useEffect } from 'react';
import { getLoanStatus } from '../utils/loanStatus';

export default function Dashboard() {
  const { clients, loans, receipts, refetchLoans, fixAllLoanStatuses } = useLocalData();
  // Refaz a busca dos empréstimos ao entrar na tela
  useEffect(() => {
    refetchLoans();
  }, [refetchLoans]);

  // Unifica cálculo igual ao Reports: soma recibos confirmados
  const stats = useMemo(() => {
    // Sempre calcula o status atualizado de cada empréstimo
    const statusMap = { active: 0, completed: 0, defaulted: 0 };
    loans.forEach(loan => {
      const status = getLoanStatus(loan, receipts, loan.payments || []) as 'active' | 'completed' | 'defaulted';
      statusMap[status]++;
    });
    const openLoans = statusMap.active + statusMap.defaulted;
    const completedLoans = statusMap.completed;
    const overdueLoans = statusMap.defaulted;
    const totalLoaned = loans.reduce((sum, loan) => sum + (loan.amount || 0), 0);

    // Total Recebido: soma todos os recibos
    const totalReceived = receipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0);

    // Saldo a Receber: soma de todos os empréstimos ativos e atrasados (active + defaulted)
    const pendingAmount = loans
      .filter(loan => {
        const status = getLoanStatus(loan, receipts, loan.payments || []);
        return status === 'active' || status === 'defaulted';
      })
      .reduce((sum, loan) => {
        const recibosDoEmprestimo = receipts.filter(r => r.loanId === loan.id);
        const totalPago = recibosDoEmprestimo.reduce((s, r) => s + (r.amount || 0), 0);
        if (loan.paymentType === 'interest_only') {
          const hasFull = loan.payments && loan.payments.some(p => p.type === 'full');
          return sum + (hasFull ? 0 : loan.totalAmount - totalPago);
        } else if (loan.paymentType === 'diario') {
          const hasFull = loan.payments && loan.payments.some(p => p.type === 'full');
          const totalParcelas = loan.installments || loan.numberOfInstallments || 0;
          const valorParcela = loan.installmentAmount || 0;
          const saldo = hasFull ? 0 : Math.max((totalParcelas * valorParcela) - totalPago, 0);
          return sum + saldo;
        } else {
          const saldo = loan.totalAmount - totalPago;
          return sum + (saldo > 0 ? saldo : 0);
        }
      }, 0);

    return {
      clientCount: clients.length,
      openLoans,
      completedLoans,
      overdueLoans,
      totalLoaned,
      totalReceived,
      pendingAmount,
    };
  }, [clients, loans, receipts]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dinheiro Rápido</h1>
        <p className="text-gray-600">Sistema de Controle de Empréstimos e Geração de Recibos</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Clientes" 
          value={stats.clientCount} 
          icon={<Users size={24} />} 
          to="/clients"
        />
        <StatCard 
          title="Empréstimos Ativos" 
          value={stats.openLoans} 
          icon={<CreditCard size={24} />} 
          to="/loans"
          color="secondary"
        />
        <StatCard 
          title="Total Emprestado" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalLoaned)} 
          icon={<TrendingUp size={24} />} 
          to="/reports"
          color="success"
        />
        <StatCard 
          title="Total Recebido" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalReceived)} 
          icon={<Receipt size={24} />} 
          to="/receipts"
          color="info"
        />
      </div>
      {/* Resumo de status abaixo dos cards, mantendo o layout */}
    {/* Indicadores removidos conforme solicitado */}

      {/* Financial Summary */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Resumo Financeiro</h2>
          <Link to="/reports" className="text-indigo-600 hover:text-indigo-800 text-sm">
            Ver relatórios completos
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Total Emprestado</p>
            <p className="text-xl font-semibold text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalLoaned)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Total Recebido</p>
            <p className="text-xl font-semibold text-blue-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalReceived)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Saldo a Receber</p>
            <p className="text-xl font-semibold text-purple-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.pendingAmount)}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/clients/add" className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center hover:shadow-md transition-shadow">
            <div className="p-3 rounded-md bg-indigo-100 text-indigo-600 mr-4">
              <Plus size={20} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Novo Cliente</h3>
              <p className="text-sm text-gray-500">Cadastrar um novo cliente</p>
            </div>
          </Link>
          <Link to="/loans/add" className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center hover:shadow-md transition-shadow">
            <div className="p-3 rounded-md bg-green-100 text-green-600 mr-4">
              <Plus size={20} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Novo Empréstimo</h3>
              <p className="text-sm text-gray-500">Registrar um novo empréstimo</p>
            </div>
          </Link>
          <Link to="/receipts" className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center hover:shadow-md transition-shadow">
            <div className="p-3 rounded-md bg-blue-100 text-blue-600 mr-4">
              <Receipt size={20} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Recibos</h3>
              <p className="text-sm text-gray-500">Visualizar todos os recibos</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}