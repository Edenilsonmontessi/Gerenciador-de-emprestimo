import { useState } from 'react';
import { Plus, Search, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocalData } from '../contexts/SupabaseContext';

export default function Clients() {
  const { clients, deleteClientCascade } = useLocalData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    client.phone.includes(searchTerm) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Seleção múltipla
  const toggleSelectClient = (clientId: string) => {
    setSelectedClients((prev) =>
      prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]
    );
  };
  const selectAll = () => {
    setSelectedClients(filteredClients.map(c => c.id));
  };
  const deselectAll = () => {
    setSelectedClients([]);
  };

  // Exclusão múltipla
  const handleDeleteSelected = async () => {
    if (selectedClients.length === 0) return;
    if (window.confirm(`Tem certeza que deseja apagar ${selectedClients.length} cliente(s)? Esta ação não pode ser desfeita. Todos os empréstimos e recibos relacionados também serão excluídos!`)) {
      for (const clientId of selectedClients) {
        await deleteClientCascade(clientId);
      }
      alert('Clientes apagados com sucesso!');
      setSelectedClients([]);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <Link 
          to="/clients/add" 
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> Novo Cliente
        </Link>
      </div>

      {/* Botão de exclusão múltipla */}
      {selectedClients.length > 0 && (
        <div className="mb-4 flex gap-2 items-center">
          <button onClick={handleDeleteSelected} className="btn btn-danger">
            Excluir Selecionados ({selectedClients.length})
          </button>
          <button onClick={deselectAll} className="btn btn-secondary text-xs">Limpar Seleção</button>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="form-input pl-10 py-3"
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Client list */}
      {filteredClients.length > 0 ? (
        <div className="overflow-x-auto bg-white shadow-sm rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                    onChange={e => e.target.checked ? selectAll() : deselectAll()}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPF</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cidade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedClients.includes(client.id)}
                      onChange={() => toggleSelectClient(client.id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{client.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{client.phone}</div>
                    <div className="text-sm text-gray-500">{client.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{client.cpf}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{client.city}, {client.state}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Link to={`/clients/${client.id}`} className="text-indigo-600 hover:text-indigo-900 mr-3">
                      Detalhes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg p-12 text-center">
          <UserX className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum cliente cadastrado</h3>
          <p className="mt-2 text-gray-500">
            {searchTerm ? 'Nenhum resultado encontrado para sua busca.' : 'Comece adicionando um novo cliente.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <Link to="/clients/add" className="btn btn-primary inline-flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                Novo Cliente
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}