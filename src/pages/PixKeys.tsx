import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';

export interface PixKey {
  id: string;
  bank: string;
  owner: string;
  type: string;
  value: string;
  instructions: string;
}

function mapPixKeyFromDb(db: any): PixKey {
  return {
    id: db.id,
    bank: db.bank,
    owner: db.owner,
    type: db.type,
    value: db.value,
    instructions: db.instructions,
  };
}
function mapPixKeyToDb(key: Omit<PixKey, 'id'>) {
  return {
    bank: key.bank,
    owner: key.owner,
    type: key.type,
    value: key.value,
    instructions: key.instructions,
  };
}

// CRUD PixKey com Supabase
export async function fetchPixKeys(): Promise<PixKey[]> {
  const { data, error } = await supabase.from('pix_keys').select('*').order('id');
  if (error || !data) return [];
  return data.map(mapPixKeyFromDb);
}
export async function addPixKey(key: Omit<PixKey, 'id'>): Promise<PixKey | null> {
  const { data, error } = await supabase.from('pix_keys').insert([mapPixKeyToDb(key)]).select().single();
  if (error || !data) return null;
  return mapPixKeyFromDb(data);
}
export async function updatePixKey(id: string, key: Partial<PixKey>): Promise<PixKey | null> {
  const { data, error } = await supabase.from('pix_keys').update(key).eq('id', id).select().single();
  if (error || !data) return null;
  return mapPixKeyFromDb(data);
}
export async function deletePixKey(id: string): Promise<boolean> {
  const { error } = await supabase.from('pix_keys').delete().eq('id', id);
  return !error;
}

// Hook para real-time PixKeys
export function usePixKeysRealtime() {
  const [pixKeys, setPixKeys] = useState<PixKey[]>([]);
  useEffect(() => {
    fetchPixKeys().then(setPixKeys);
    const sub = supabase
      .channel('public:pix_keys')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pix_keys' }, () => {
        fetchPixKeys().then(setPixKeys);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
  }, []);
  return [pixKeys, setPixKeys] as const;
}

// Chaves Pix padrão para fallback visual
const defaultPixKeys: PixKey[] = [
  {
    id: '1',
    bank: 'C6',
    owner: 'Rota97beer',
    type: 'Telefone',
    value: '67984741014',
    instructions: 'APÓS O PAGAMENTO ENVIAR FOTO DO COMPROVANTE',
  },
  {
    id: '2',
    bank: 'Bradesco',
    owner: 'Fernando ysleyk de Moura',
    type: 'Email',
    value: 'f7motos@gmail.com',
    instructions: 'APÓS O PAGAMENTO ENVIAR FOTO DO COMPROVANTE',
  },
  {
    id: '3',
    bank: 'Itaú',
    owner: 'Fernando ysleyk de Moura',
    type: 'Email',
    value: 'fernandoysleyk.fyk@gmail.com',
    instructions: 'APÓS O PAGAMENTO ENVIAR FOTO DO COMPROVANTE',
  },
  {
    id: '4',
    bank: 'INTER',
    owner: 'Rota 97 beer',
    type: 'CNPJ',
    value: '24.944.897.0001/70',
    instructions: 'APÓS O PAGAMENTO ENVIAR FOTO DO COMPROVANTE',
  },
  {
    id: '5',
    bank: 'Pagbank',
    owner: 'Rota 97 beer',
    type: 'Email',
    value: 'rota97beer@gmail.com',
    instructions: 'APÓS O PAGAMENTO ENVIAR FOTO DO COMPROVANTE',
  },
];

export default function PixKeys() {
  const [pixKeys] = usePixKeysRealtime();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<PixKey>>({});

  // Fallback visual: se não houver nada no Supabase, mostra as chaves padrão
  const keysToShow = pixKeys.length > 0 ? pixKeys : defaultPixKeys;

  function handleEdit(key: PixKey) {
    setEditing(key.id);
    setForm(key);
  }

  async function handleDelete(id: string) {
    if (window.confirm('Deseja realmente excluir esta chave Pix?')) {
      await deletePixKey(id);
      // Não precisa atualizar manualmente, real-time faz isso
    }
  }

  function handleShare(key: PixKey) {
    const msg = `DADOS PARA PAGAMENTO\nBANCO ${key.bank}\n${key.owner}\nCHAVE PIX ${key.type}\n\n${key.value}\n\nAPÓS O PAGAMENTO ENVIAR FOTO DO COMPROVANTE`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.bank || !form.owner || !form.type || !form.value) return;
    if (editing) {
      await updatePixKey(editing, form as PixKey);
      setEditing(null);
    } else {
      await addPixKey({ ...form, instructions: form.instructions || '' } as Omit<PixKey, 'id'>);
    }
    setForm({});
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Minhas Chaves Pix - Personalizado por Você</h1>
      <form onSubmit={handleSave} className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-2">
        <input className="form-input" placeholder="Banco" value={form.bank ?? ''} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} />
        <input className="form-input" placeholder="Titular" value={form.owner ?? ''} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
        <input className="form-input" placeholder="Tipo (Email, Telefone, CNPJ)" value={form.type ?? ''} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} />
        <input className="form-input" placeholder="Chave Pix" value={form.value ?? ''} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
        <input className="form-input" placeholder="Instruções" value={form.instructions ?? ''} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} />
        <button className="btn btn-primary col-span-1 md:col-span-1" type="submit">{editing ? 'Salvar' : 'Cadastrar Nova'}</button>
        {editing && <button className="btn bg-gray-200 col-span-1 md:col-span-1" type="button" onClick={() => { setEditing(null); setForm({}); }}>Cancelar</button>}
      </form>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2">Banco</th>
              <th className="px-4 py-2">Titular</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Chave</th>
              <th className="px-4 py-2">Instruções</th>
              <th className="px-4 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {keysToShow.map(key => (
              <tr key={key.id}>
                <td className="px-4 py-2">{key.bank}</td>
                <td className="px-4 py-2">{key.owner}</td>
                <td className="px-4 py-2">{key.type}</td>
                <td className="px-4 py-2">{key.value}</td>
                <td className="px-4 py-2">{key.instructions}</td>
                <td className="px-4 py-2 flex gap-2">
                  <button className="btn btn-xs btn-info" type="button" onClick={() => handleShare(key)}>Compartilhar</button>
                  <button className="btn btn-xs btn-warning" type="button" onClick={() => handleEdit(key)}>Editar</button>
                  <button className="btn btn-xs btn-danger" type="button" onClick={() => handleDelete(key.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="mt-8 text-center text-gray-400 text-xs">Desenvolvido por Seu Nome - {new Date().getFullYear()}</footer>
    </div>
  );
}
