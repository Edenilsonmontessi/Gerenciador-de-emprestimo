import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import { useLocalData } from '../contexts/SupabaseContext';
import { ReportFilter } from '../types';

export default function Reports() {
  const { loans, receipts, clients, updateLoan, payments } = useLocalData();
  // Recalcula e atualiza o status de todos os empréstimos ao abrir a tela de relatórios
  useEffect(() => {
    loans.forEach(async (loan) => {
      let newStatus = loan.status;
      const today = new Date();
      const dueDate = new Date(loan.dueDate);
      const recibosDoEmprestimo = receipts.filter(r => r.loanId === loan.id);
      const totalPagoRecibos = recibosDoEmprestimo.reduce((sum, r) => sum + (r.amount || 0), 0);
      // Considera inadimplente qualquer empréstimo vencido e não quitado, independente da modalidade
      const hasQuitacao = payments.filter(p => p.loanId === loan.id).some(p => p.type === 'full');
      const totalParcelas = loan.installments || loan.numberOfInstallments || 0;
      const recibosPagos = receipts.filter(r => r.loanId === loan.id).length;
      const pagamentosDoEmprestimo = payments.filter(p => p.loanId === loan.id);
      const hasFullPayment = pagamentosDoEmprestimo.some(p => p.type === 'full' && p.amount >= loan.totalAmount);
      if (hasQuitacao || hasFullPayment || (totalParcelas > 0 && recibosPagos >= totalParcelas) || (loan.paymentType !== 'diario' && totalPagoRecibos >= loan.totalAmount)) {
        newStatus = 'completed';
      } else if (today > dueDate) {
        newStatus = 'defaulted';
      } else {
        newStatus = 'active';
      }
      if (newStatus !== loan.status) {
        await updateLoan(loan.id, { status: newStatus });
      }
    });
  }, [loans, receipts, payments, updateLoan]);
  const [filter, setFilter] = useState<ReportFilter>({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  
  const [loanData, setLoanData] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState<any[]>([]);
  
  // Apply filters to calculations
  useEffect(() => {
    const filteredLoans = loans.filter(loan => {
      const loanDate = new Date(loan.createdAt);
      const startDate = filter.startDate ? new Date(filter.startDate) : null;
      const endDate = filter.endDate ? new Date(filter.endDate) : null;
      
      let matchesFilter = true;
      
      if (startDate && loanDate < startDate) matchesFilter = false;
      if (endDate) {
        const endWithDay = new Date(endDate);
        endWithDay.setHours(23, 59, 59, 999);
        if (loanDate > endWithDay) matchesFilter = false;
      }
      
      if (filter.clientId && loan.clientId !== filter.clientId) matchesFilter = false;
      if (filter.status && loan.status !== filter.status) matchesFilter = false;
      
      return matchesFilter;
    });
    
    // Group loans by month for chart
    const loansByMonth: Record<string, { month: string, count: number, amount: number }> = {};
    
    filteredLoans.forEach(loan => {
      const date = new Date(loan.createdAt);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      
      if (!loansByMonth[monthYear]) {
        loansByMonth[monthYear] = {
          month: monthYear,
          count: 0,
          amount: 0
        };
      }
      
      loansByMonth[monthYear].count += 1;
      loansByMonth[monthYear].amount += loan.amount;
    });
    
    setLoanData(Object.values(loansByMonth));
    
    // Filter and group payments by month
    const filteredReceipts = receipts.filter(receipt => {
      const receiptDate = new Date(receipt.date);
      const startDate = filter.startDate ? new Date(filter.startDate) : null;
      const endDate = filter.endDate ? new Date(filter.endDate) : null;
      
      let matchesFilter = true;
      
      if (startDate && receiptDate < startDate) matchesFilter = false;
      if (endDate) {
        const endWithDay = new Date(endDate);
        endWithDay.setHours(23, 59, 59, 999);
        if (receiptDate > endWithDay) matchesFilter = false;
      }
      
      if (filter.clientId && receipt.clientId !== filter.clientId) matchesFilter = false;
      
      return matchesFilter;
    });
    
    const paymentsByMonth: Record<string, { month: string, count: number, amount: number }> = {};
    
    filteredReceipts.forEach(receipt => {
      const date = new Date(receipt.date);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      
      if (!paymentsByMonth[monthYear]) {
        paymentsByMonth[monthYear] = {
          month: monthYear,
          count: 0,
          amount: 0
        };
      }
      
      paymentsByMonth[monthYear].count += 1;
      paymentsByMonth[monthYear].amount += receipt.amount;
    });
    
    setPaymentData(Object.values(paymentsByMonth));
    
  }, [loans, receipts, filter]);
  
  // Calculate summary data
  // Agora soma apenas o valor realmente emprestado (campo amount)
  const totalLoaned = loans.reduce((sum, loan) => {
    const value = Number(loan.amount);
    return sum + (isNaN(value) ? 0 : value);
  }, 0);
  // Calcula o total recebido igual ao Dashboard (soma todos os recibos gerados)
  const totalReceived = receipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0);
  // Calcula o saldo a receber apenas dos empréstimos ativos
  const pendingAmount = loans
    .filter(loan => loan.status === 'active')
    .reduce((sum, loan) => {
      if (loan.paymentType === 'interest_only') {
        const hasFull = loan.payments && loan.payments.some(p => p.type === 'full');
        return sum + (hasFull ? 0 : loan.totalAmount);
      } else if (loan.paymentType === 'diario') {
        const hasFull = loan.payments && loan.payments.some(p => p.type === 'full');
        const totalParcelas = loan.installments || loan.numberOfInstallments || 0;
        const valorParcela = loan.installmentAmount || 0;
        const totalPago = receipts.filter(r => r.loanId === loan.id).reduce((s, r) => s + (r.amount || 0), 0);
        const saldo = hasFull ? 0 : Math.max((totalParcelas * valorParcela) - totalPago, 0);
        return sum + saldo;
      } else {
        const paid = receipts.filter(r => r.loanId === loan.id).reduce((s, r) => s + (r.amount || 0), 0);
        const saldo = loan.totalAmount - paid;
        return sum + (saldo > 0 ? saldo : 0);
      }
    }, 0);
  
  const activeLoans = loans.filter(loan => loan.status === 'active').length;
  const completedLoans = loans.filter(loan => loan.status === 'completed').length;
  const defaultedLoans = loans.filter(loan => loan.status === 'defaulted').length;
  
  // Handle filter changes
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-600">Análise de desempenho financeiro</p>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 text-indigo-600 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Filtros</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="form-label" htmlFor="startDate">Data Inicial</label>
            <input 
              type="date" 
              id="startDate"
              name="startDate"
              className="form-input"
              value={filter.startDate} 
              onChange={handleFilterChange}
            />
          </div>
          
          <div>
            <label className="form-label" htmlFor="endDate">Data Final</label>
            <input 
              type="date" 
              id="endDate"
              name="endDate"
              className="form-input"
              value={filter.endDate} 
              onChange={handleFilterChange}
            />
          </div>
          
          <div>
            <label className="form-label" htmlFor="clientId">Cliente</label>
            <select 
              id="clientId"
              name="clientId"
              className="form-input"
              value={filter.clientId || ''} 
              onChange={handleFilterChange}
            >
              <option value="">Todos os Clientes</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="form-label" htmlFor="status">Status</label>
            <select 
              id="status"
              name="status"
              className="form-input"
              value={filter.status || ''} 
              onChange={handleFilterChange}
            >
              <option value="">Todos os Status</option>
              <option value="active">Ativos</option>
              <option value="completed">Concluídos</option>
              <option value="defaulted">Inadimplentes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Emprestado</p>
              <p className="text-2xl font-semibold text-green-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalLoaned)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Recebido</p>
              <p className="text-2xl font-semibold text-blue-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalReceived)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <TrendingDown className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Saldo a Receber</p>
              <p className="text-2xl font-semibold text-purple-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingAmount)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-100">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Loan Status */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Status dos Empréstimos</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 border border-gray-200 rounded-md bg-green-50">
            <p className="text-sm text-gray-500">Ativos</p>
            <p className="text-xl font-semibold text-green-600">{activeLoans}</p>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-md bg-blue-50">
            <p className="text-sm text-gray-500">Concluídos</p>
            <p className="text-xl font-semibold text-blue-600">{completedLoans}</p>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-md bg-red-50">
            <p className="text-sm text-gray-500">Inadimplentes</p>
            <p className="text-xl font-semibold text-red-600">{defaultedLoans}</p>
          </div>
        </div>
        
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { name: 'Ativos', value: activeLoans, color: '#10B981' },
                { name: 'Concluídos', value: completedLoans, color: '#3B82F6' },
                { name: 'Inadimplentes', value: defaultedLoans, color: '#EF4444' }
              ]}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `${value} empréstimos`} />
              <Bar dataKey="value" name="Empréstimos" fill="#8884d8" barSize={60}>
                {[
                  { name: 'Ativos', value: activeLoans, color: '#10B981' },
                  { name: 'Concluídos', value: completedLoans, color: '#3B82F6' },
                  { name: 'Inadimplentes', value: defaultedLoans, color: '#EF4444' }
                ].map((entry, index) => (
                  <Bar key={`cell-${index}`} dataKey="value" fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Valores Emprestados por Período</h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={loanData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: any) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value)), 'Valor']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  name="Valor Emprestado" 
                  stroke="#10B981" 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Valores Recebidos por Período</h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={paymentData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                {/* Corrige o erro de sobrecarga do Tooltip para valores monetários */}
                <Tooltip formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  name="Valor Recebido" 
                  stroke="#3B82F6" 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Transaction Count Charts */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quantidade de Transações</h2>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={loanData.map((loan, index) => ({
                month: loan.month,
                loans: loan.count,
                payments: paymentData[index]?.count || 0
              }))}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))} />
              <Legend />
              <Bar dataKey="loans" name="Empréstimos" fill="#10B981" />
              <Bar dataKey="payments" name="Pagamentos" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}