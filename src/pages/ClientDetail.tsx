import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, Receipt, Pencil, Trash, AlertTriangle } from 'lucide-react';
import { useLocalData } from '../contexts/SupabaseContext';
import { Client, Loan, Receipt as ReceiptType } from '../types';

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clients, loans, receipts, deleteReceipt, updateClient, deleteClientCascade } = useLocalData();
  
  const [client, setClient] = useState<Client | null>(null);
  const [clientLoans, setClientLoans] = useState<Loan[]>([]);
  const [clientReceipts, setClientReceipts] = useState<ReceiptType[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteReceiptModal, setShowDeleteReceiptModal] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (id) {
      const foundClient = clients.find(c => c.id === id);
      if (foundClient) {
        setClient(foundClient);
        
        // Find loans for this client
        const foundLoans = loans.filter(loan => loan.clientId === id);
        setClientLoans(foundLoans);

        // Find receipts for this client
        const foundReceipts = receipts.filter(receipt => receipt.clientId === id);
        setClientReceipts(foundReceipts);
      } else {
        navigate('/clients');
      }
    }
  }, [id, clients, loans, receipts, navigate]);

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteClientCascade(id);
      navigate('/clients');
    } catch (error) {
      console.error('Error deleting client:', error);
      setIsDeleting(false);
    }
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    try {
      await deleteReceipt(receiptId);
      setClientReceipts(prev => prev.filter(r => r.id !== receiptId));
      setShowDeleteReceiptModal(null);
    } catch (error) {
      console.error('Error deleting receipt:', error);
    }
  };

  const handleEditClient = async (updatedData: Partial<Client>) => {
    if (!client) return;
    try {
      const updatedClient = await updateClient(client.id, updatedData);
      if (updatedClient) {
        alert('Informações do cliente atualizadas com sucesso!');
        setClient(updatedClient);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      alert('Erro ao atualizar cliente. Tente novamente mais tarde.');
    }
  };

  if (!client) {
    return <div className="p-4 text-center">Carregando...</div>;
  }

  return (
    <div>
      {/* Client header section */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/clients')}
            className="text-gray-500 hover:text-gray-700 flex items-center"
          >
            <ArrowLeft size={20} className="mr-1" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link 
            to={`/loans/add?clientId=${client.id}`}
            className="btn btn-success flex items-center gap-2"
          >
            <CreditCard size={18} />
            Novo Empréstimo
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn btn-danger flex items-center gap-2"
          >
            <Trash size={18} />
            Excluir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Informações do Cliente</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Nome Completo</label>
                <p className="text-gray-900">{client.name}</p>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">CPF</label>
                <p className="text-gray-900">{client.cpf || '-'}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Email</label>
                  <p className="text-gray-900">{client.email || '-'}</p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-500">Telefone</label>
                  <p className="text-gray-900">{client.phone}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Endereço</label>
                <p className="text-gray-900">{client.address || '-'}</p>
                <p className="text-gray-900">
                  {client.city ? `${client.city}${client.state ? ', ' + client.state : ''}` : '-'}
                </p>
              </div>
              
              {client.notes && (
                <div>
                  <label className="text-sm text-gray-500">Observações</label>
                  <p className="text-gray-900 whitespace-pre-line">{client.notes}</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setIsEditing(true)}
                className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Pencil size={16} />
                Editar informações
              </button>
            </div>
          </div>
        </div>
        
        {/* Loans and Receipts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Loans */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Empréstimos</h2>
              <Link 
                to={`/loans/add?clientId=${client.id}`}
                className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-sm"
              >
                <CreditCard size={16} />
                Novo Empréstimo
              </Link>
            </div>
            
            {clientLoans.length > 0 ? (
              <div className="overflow-x-auto -mx-6 -mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Parcelas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Saldo a Receber
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {clientLoans.map((loan) => {
                      // Calcula o total pago confirmado via recibos para este empréstimo
                      const recibosDoEmprestimo = clientReceipts.filter(r => r.loanId === loan.id);
                      const totalPago = recibosDoEmprestimo.reduce((sum, r) => sum + (r.amount || 0), 0);
                      const saldoAReceber = loan.paymentType === 'interest_only'
                        ? loan.totalAmount
                        : loan.totalAmount - totalPago;
                      return (
                        <tr key={loan.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(loan.createdAt).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(loan.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {loan.installments}x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(loan.installmentAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${loan.status === 'active' ? 'bg-green-100 text-green-800' : 
                                loan.status === 'completed' ? 'bg-blue-100 text-blue-800' : 
                                'bg-red-100 text-red-800'}`}
                            >
                              {loan.status === 'active' ? 'Ativo' : 
                                loan.status === 'completed' ? 'Concluído' : 'Inadimplente'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoAReceber)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <Link to={`/loans/${loan.id}`} className="text-indigo-600 hover:text-indigo-900">
                              Detalhes
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 p-6 rounded-md text-center">
                <CreditCard className="w-10 h-10 text-gray-400 mx-auto" />
                <p className="mt-2 text-gray-500">Este cliente não possui empréstimos.</p>
                <Link 
                  to={`/loans/add?clientId=${client.id}`}
                  className="mt-3 inline-block text-indigo-600 hover:text-indigo-800"
                >
                  Registrar primeiro empréstimo
                </Link>
              </div>
            )}
          </div>
          
          {/* Recent Receipts */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Recibos</h2>
            </div>
            
            {clientReceipts.length > 0 ? (
              <div className="overflow-x-auto -mx-6 -mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nº Recibo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {clientReceipts.map((receipt) => (
                      <tr key={receipt.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {receipt.receiptNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(receipt.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receipt.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                          <Link to={`/receipts/${receipt.id}`} className="text-indigo-600 hover:text-indigo-900">
                            Visualizar
                          </Link>
                          <button
                            onClick={() => setShowDeleteReceiptModal(receipt.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 p-6 rounded-md text-center">
                <Receipt className="w-10 h-10 text-gray-400 mx-auto" />
                <p className="mt-2 text-gray-500">Este cliente não possui recibos.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Delete Client Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">Excluir cliente</h3>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
                  {clientLoans.length > 0 && (
                    <span className="block mt-2 font-semibold text-red-600">
                      Atenção: Este cliente possui {clientLoans.length} empréstimo(s) registrado(s).
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3 rounded-b-lg">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Receipt Modal */}
      {showDeleteReceiptModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">Excluir recibo</h3>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  Tem certeza que deseja excluir este recibo? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3 rounded-b-lg">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={() => setShowDeleteReceiptModal(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => handleDeleteReceipt(showDeleteReceiptModal)}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Info Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <Pencil className="h-6 w-6 text-indigo-600" />
                <h3 className="ml-3 text-lg font-medium text-gray-900">Editar informações do cliente</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">Nome Completo <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={client.name}
                    onChange={e => setClient({ ...client, name: e.target.value })}
                    className={`mt-1 block w-full px-3 py-2 border ${!client.name ? 'border-red-400' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                  />
                  {!client.name && <p className="text-xs text-red-500 mt-1">Nome é obrigatório</p>}
                </div>
                <div>
                  <label className="text-sm text-gray-500">Telefone <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={client.phone}
                    onChange={e => setClient({ ...client, phone: e.target.value })}
                    className={`mt-1 block w-full px-3 py-2 border ${!client.phone ? 'border-red-400' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                  />
                  {!client.phone && <p className="text-xs text-red-500 mt-1">Telefone é obrigatório</p>}
                </div>
                <div>
                  <label className="text-sm text-gray-500">CPF</label>
                  <input
                    type="text"
                    value={client.cpf || ''}
                    onChange={e => setClient({ ...client, cpf: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Email</label>
                  <input
                    type="email"
                    value={client.email || ''}
                    onChange={e => setClient({ ...client, email: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Endereço</label>
                  <input
                    type="text"
                    value={client.address || ''}
                    onChange={e => setClient({ ...client, address: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Cidade</label>
                    <input
                      type="text"
                      value={client.city || ''}
                      onChange={e => setClient({ ...client, city: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Estado</label>
                    <input
                      type="text"
                      value={client.state || ''}
                      onChange={e => setClient({ ...client, state: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Observações</label>
                  <textarea
                    value={client.notes || ''}
                    onChange={e => setClient({ ...client, notes: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    rows={3}
                  />
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3 rounded-b-lg mt-6">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={() => setIsEditing(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!client.name || !client.phone}
                  onClick={() => {
                    if (!client.name || !client.phone) return;
                    // Envia todos os campos NOT NULL como string (mesmo vazia)
                    const updatedData = {
                      name: client.name,
                      phone: client.phone,
                      email: client.email?.trim() || '',
                      cpf: client.cpf?.trim() || '',
                      address: client.address?.trim() || '',
                      city: client.city?.trim() || '',
                      state: client.state?.trim() || '',
                      // zip_code removido do envio para o banco
                      notes: client.notes?.trim() || ''
                    };
                    handleEditClient(updatedData);
                  }}
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}