const { createClient } = require('@supabase/supabase-js');

// Configure suas variáveis de ambiente aqui ou use process.env
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'SUA_SUPABASE_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'SUA_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

const defaultPixKeys = [
  {
    bank: 'C6',
    owner: 'Rota97beer',
    type: 'Telefone',
    value: '67984741014',
    instructions: 'APÓS O PAGAMENTO ENVIAR FOTO DO COMPROVANTE',
  },
  {
    bank: 'Bradesco',
    owner: 'Fernando ysleyk de Moura',
    type: 'Email',
    value: 'f7motos@gmail.com',
    instructions: 'APÓS O PAGAMENTO ENVIAR FOTO DO COMPROVANTE',
  },
  {
    bank: 'Itaú',
    owner: 'Fernando ysleyk de Moura',
    type: 'Email',
    value: 'fernandoysleyk.fyk@gmail.com',
    instructions: 'APÓS O PAGAMENTO ENVIAR FOTO DO COMPROVANTE',
  },
  {
    bank: 'INTER',
    owner: 'Rota 97 beer',
    type: 'CNPJ',
    value: '24.944.897.0001/70',
    instructions: 'APÓS O PAGAMENTO ENVIAR FOTO DO COMPROVANTE',
  },
  {
    bank: 'Pagbank',
    owner: 'Rota 97 beer',
    type: 'Email',
    value: 'rota97beer@gmail.com',
    instructions: 'APÓS O PAGAMENTO ENVIAR FOTO DO COMPROVANTE',
  },
];

async function restorePixKeys() {
  for (const key of defaultPixKeys) {
    const { error } = await supabase.from('pix_keys').insert([key]);
    if (error) {
      console.error('Erro ao adicionar chave:', key, error.message);
    } else {
      console.log('Chave Pix adicionada:', key);
    }
  }
  console.log('Restauração concluída!');
  process.exit(0);
}

restorePixKeys();
