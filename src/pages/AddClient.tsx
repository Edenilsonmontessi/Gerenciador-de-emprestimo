import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalData } from '../contexts/SupabaseContext';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';

type ClientFormData = {
  name: string;
  email?: string;
  phone: string;
  cpf?: string;
  address?: string;
  city?: string;
  state?: string;
  notes?: string;
};

export default function AddClient() {
  const navigate = useNavigate();
  const { addClient } = useLocalData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ClientFormData>();

  const onSubmit = async (data: ClientFormData) => {
    setIsSubmitting(true);
    try {
      // Limpa o telefone e adiciona 55 se necessário
      let phone = data.phone.replace(/\D/g, '');
      if (phone.length >= 11 && phone.startsWith('0')) {
        phone = phone.replace(/^0+/, '');
      }
      if (!phone.startsWith('55')) {
        phone = '55' + phone;
      }
      // Garante que todos os campos opcionais do cliente sejam enviados como string, nunca undefined, evitando erro de tipo e erro 400 do Supabase.
      const clientToSave = {
        name: data.name,
        phone,
        email: data.email || '',
        cpf: data.cpf || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        notes: data.notes || '',
      };
      const newClient = await addClient(clientToSave);
      if (newClient) {
        navigate(`/clients/${newClient.id}`);
      }
    } catch (error) {
      console.error('Error adding client:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <button 
          onClick={() => navigate('/clients')}
          className="text-gray-500 hover:text-gray-700 flex items-center"
        >
          <ArrowLeft size={20} className="mr-1" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Novo Cliente</h1>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="form-label">Nome completo *</label>
              <input
                type="text"
                id="name"
                className={`form-input ${errors.name ? 'border-red-300' : ''}`}
                {...register('name', { required: 'Nome é obrigatório' })}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>
            
            <div>
              <label htmlFor="phone" className="form-label">Telefone *</label>
              <input
                type="text"
                id="phone"
                className={`form-input ${errors.phone ? 'border-red-300' : ''}`}
                placeholder="(00) 00000-0000"
                {...register('phone', { required: 'Telefone é obrigatório' })}
              />
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
            </div>
            
            <div>
              <label htmlFor="cpf" className="form-label">CPF</label>
              <input
                type="text"
                id="cpf"
                className="form-input"
                placeholder="000.000.000-00"
                {...register('cpf')}
              />
            </div>
            
            <div>
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                id="email"
                className="form-input"
                {...register('email')}
              />
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="address" className="form-label">Endereço</label>
              <input
                type="text"
                id="address"
                className="form-input"
                {...register('address')}
              />
            </div>
            
            <div>
              <label htmlFor="city" className="form-label">Cidade</label>
              <input
                type="text"
                id="city"
                className="form-input"
                {...register('city')}
              />
            </div>
            
            <div>
              <label htmlFor="state" className="form-label">Estado</label>
              <input
                type="text"
                id="state"
                className="form-input"
                maxLength={2}
                {...register('state')}
              />
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="notes" className="form-label">Observações</label>
              <textarea
                id="notes"
                rows={4}
                className="form-input"
                {...register('notes')}
              ></textarea>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/clients')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary flex items-center gap-2"
            >
              <Save size={18} />
              {isSubmitting ? 'Salvando...' : 'Salvar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}