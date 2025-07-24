import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { getLoanStatus } from '../utils/loanStatus';
import type { Client, Loan, Receipt, Payment } from '../types';

interface LocalDataContextType {
  clients: Client[];
  loans: Loan[];
  receipts: Receipt[];
  payments: Payment[];
  isLoaded: boolean;
  refetchClients: () => Promise<void>;
  refetchLoans: () => Promise<void>;
  refetchReceipts: () => Promise<void>;
  refetchPayments: () => Promise<void>;
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<Client | null>;
  addLoan: (loan: Omit<Loan, 'id' | 'createdAt'>) => Promise<Loan | null>;
  addReceipt: (receipt: Omit<Receipt, 'id' | 'createdAt'>) => Promise<Receipt | null>;
  updateClient: (id: string, client: Partial<Client>) => Promise<Client | null>;
  updateLoan: (id: string, loan: Partial<Loan>) => Promise<Loan | null>;
  deleteClient: (id: string) => Promise<boolean>;
  deleteLoan: (id: string) => Promise<boolean>;
  deleteReceipt: (id: string) => Promise<boolean>;
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => Promise<Payment | null>;
  deleteClientCascade: (id: string) => Promise<boolean>;
  deleteLoanCascade: (id: string) => Promise<boolean>;
  fixAllLoanStatuses: () => Promise<void>;
}

const LocalDataContext = createContext<LocalDataContextType | undefined>(undefined);

export function LocalDataProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Refetchs
  async function refetchClients() {
    const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    if (!error && data) setClients(data.map(mapClientFromDb));
  }

  async function refetchLoans() {
    const { data, error } = await supabase.from('loans').select('*').order('created_at', { ascending: false });
    if (!error && data) setLoans(data.map(mapLoanFromDb));
  }

  async function refetchReceipts() {
    const { data, error } = await supabase.from('receipts').select('*').order('created_at', { ascending: false });
    if (!error && data) setReceipts(data.map(mapReceiptFromDb));
  }

  async function refetchPayments() {
    const { data, error } = await supabase.from('payments').select('*').order('date', { ascending: false });
    if (!error && data) setPayments(data.map((p: any) => ({
      id: p.id,
      loanId: p.loan_id,
      amount: p.amount,
      date: p.date,
      installmentNumber: p.installment_number,
      type: p.type,
      createdAt: p.created_at,
      receiptId: p.receipt_id,
    })));
  }

  // Adds
  async function addClient(client: Omit<Client, 'id' | 'createdAt'>): Promise<Client | null> {
    const { data, error } = await supabase.from('clients').insert([mapClientToDb(client)]).select().single();
    if (!error && data) {
      const mapped = mapClientFromDb(data);
      setClients(prev => [mapped, ...prev]);
      return mapped;
    }
    return null;
  }

  async function addLoan(loan: Omit<Loan, 'id' | 'createdAt'>): Promise<Loan | null> {
    const dbObj = mapLoanToDb(loan);
    console.log('[SupabaseContext][addLoan] Enviando para Supabase:', dbObj);
    const { data, error } = await supabase.from('loans').insert([dbObj]).select().single();
    console.log('[SupabaseContext][addLoan] Resposta do Supabase:', { data, error });
    if (error) {
      alert('Erro detalhado do Supabase: ' + (error.message || JSON.stringify(error)));
      console.error('Erro detalhado do Supabase:', error);
    }
    if (!error && data) {
      const mapped = mapLoanFromDb(data);
      setLoans(prev => [mapped, ...prev]);
      return mapped;
    }
    return null;
  }

  async function addReceipt(receipt: Omit<Receipt, 'id' | 'createdAt'>): Promise<Receipt | null> {
    const { data, error } = await supabase.from('receipts').insert([mapReceiptToDb(receipt)]).select().single();
    if (!error && data) {
      const mapped = mapReceiptFromDb(data);
      setReceipts(prev => [mapped, ...prev]);
      return mapped;
    }
    return null;
  }

  // Adiciona pagamento no Supabase e retorna o objeto salvo
  async function addPayment(payment: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment | null> {
    // Mapeia campos para o formato do banco
    const dbPayment = {
      loan_id: payment.loanId,
      amount: payment.amount,
      date: payment.date,
      installment_number: payment.installmentNumber,
      type: payment.type,
      // Não inclui receipt_id na criação inicial
    };
    const { data, error } = await supabase.from('payments').insert([dbPayment]).select().single();
    if (error) {
      alert('Erro ao registrar pagamento: ' + (error.message || JSON.stringify(error)));
      console.error('Erro detalhado do Supabase (addPayment):', error, dbPayment);
    }
    if (!error && data) {
      // Monta objeto Payment com UUID real
      const newPayment = {
        id: data.id,
        loanId: data.loan_id,
        amount: data.amount,
        date: data.date,
        installmentNumber: data.installment_number,
        type: data.type,
        createdAt: data.created_at,
        receiptId: data.receipt_id,
      };
      setPayments(prev => [newPayment, ...prev]);
      return newPayment;
    }
    return null;
  }

  // Updates
  async function updateClient(id: string, client: Partial<Client>): Promise<Client | null> {
    const updateData: any = { ...client };
    // Mapeia zipCode para zip_code se vier do formulário
    if (updateData.zipCode !== undefined) {
      updateData.zip_code = updateData.zipCode;
      delete updateData.zipCode;
    }
    if (updateData.createdAt) {
      updateData.created_at = updateData.createdAt;
      delete updateData.createdAt;
    }
    const { data, error } = await supabase.from('clients').update(updateData).eq('id', id).select().single();
    if (!error && data) {
      const mapped = mapClientFromDb(data);
      setClients(prev => prev.map(c => c.id === id ? mapped : c));
      return mapped;
    }
    return null;
  }

  async function updateLoan(id: string, loan: Partial<Loan>): Promise<Loan | null> {
    // REMOVE o campo payments do update enviado ao Supabase
    const updateData: any = { ...loan };
    delete updateData.payments;
    if (updateData.clientId) {
      updateData.client_id = updateData.clientId;
      delete updateData.clientId;
    }
    if (updateData.createdAt) {
      updateData.created_at = updateData.createdAt;
      delete updateData.createdAt;
    }
    if (updateData.installmentAmount) {
      updateData.installment_amount = updateData.installmentAmount;
      delete updateData.installmentAmount;
    }
    if (updateData.interestRate) {
      updateData.interest_rate = updateData.interestRate;
      delete updateData.interestRate;
    }
    if (updateData.totalAmount) {
      updateData.total_amount = updateData.totalAmount;
      delete updateData.totalAmount;
    }
    if (updateData.paymentType) {
      updateData.payment_type = updateData.paymentType;
      delete updateData.paymentType;
    }
    // Conversão de datas para ISO, igual ao mapLoanToDb
    function toISODate(date: any) {
      if (!date) return undefined;
      if (typeof date === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
          const [dia, mes, ano] = date.split('/');
          return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        }
        const d = new Date(date);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        return undefined;
      }
      if (date instanceof Date) {
        return date.toISOString().slice(0, 10);
      }
      return undefined;
    }
    if (updateData.dueDate !== undefined) {
      updateData.due_date = toISODate(updateData.dueDate);
      delete updateData.dueDate;
    }
    if (updateData.endDate !== undefined) {
      updateData.end_date = toISODate(updateData.endDate);
      delete updateData.endDate;
    }
    console.log('[SupabaseContext][updateLoan] Enviando update para Supabase:', { id, updateData });
    const { data, error } = await supabase.from('loans').update(updateData).eq('id', id).select().single();
    console.log('[SupabaseContext][updateLoan] Resposta do Supabase:', { data, error });
    if (!error && data) {
      const mapped = mapLoanFromDb(data);
      setLoans(prev => prev.map(l => l.id === id ? mapped : l));
      return mapped;
    } else if (!error) {
      // Se não houve erro, mas não retornou o registro, atualiza localmente com os dados enviados
      setLoans(prev => prev.map(l => l.id === id ? { ...l, ...loan } : l));
      return { ...loans.find(l => l.id === id), ...loan } as Loan;
    } else {
      console.error('[SupabaseContext][updateLoan] Erro ao atualizar loan:', error);
    }
    return null;
  }

  async function updateReceipt(id: string, receipt: Partial<Receipt>): Promise<Receipt | null> {
    const updateData: any = { ...receipt };
    if (updateData.clientId) {
      updateData.client_id = updateData.clientId;
      delete updateData.clientId;
    }
    if (updateData.loanId) {
      updateData.loan_id = updateData.loanId;
      delete updateData.loanId;
    }
    if (updateData.paymentId) {
      updateData.payment_id = updateData.paymentId;
      delete updateData.paymentId;
    }
    if (updateData.dueDate) {
      updateData.due_date = updateData.dueDate;
      delete updateData.dueDate;
    }
    if (updateData.receiptNumber) {
      updateData.receipt_number = updateData.receiptNumber;
      delete updateData.receiptNumber;
    }
    if (updateData.createdAt) {
      updateData.created_at = updateData.createdAt;
      delete updateData.createdAt;
    }
    const { data, error } = await supabase.from('receipts').update(updateData).eq('id', id).select().single();
    if (!error && data) {
      const mapped = mapReceiptFromDb(data);
      setReceipts(prev => prev.map(r => r.id === id ? mapped : r));
      return mapped;
    }
    return null;
  }

  // Deletes
  async function deleteClient(id: string): Promise<boolean> {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (!error) {
      setClients(prev => prev.filter(c => c.id !== id));
      return true;
    }
    return false;
  }

  async function deleteLoan(id: string): Promise<boolean> {
    const { error } = await supabase.from('loans').delete().eq('id', id);
    if (!error) {
      setLoans(prev => prev.filter(l => l.id !== id));
      return true;
    }
    return false;
  }

  async function deleteReceipt(id: string): Promise<boolean> {
    const { error } = await supabase.from('receipts').delete().eq('id', id);
    if (!error) {
      setReceipts(prev => prev.filter(r => r.id !== id));
      return true;
    }
    return false;
  }

  // Exclui todos os recibos e pagamentos de um empréstimo
  async function deleteLoanCascade(id: string): Promise<boolean> {
    // Exclui recibos
    await supabase.from('receipts').delete().eq('loan_id', id);
    // Exclui pagamentos
    await supabase.from('payments').delete().eq('loan_id', id);
    // Exclui o empréstimo
    return await deleteLoan(id);
  }

  // Exclui todos os empréstimos, recibos e pagamentos de um cliente
  async function deleteClientCascade(id: string): Promise<boolean> {
    // Busca todos os empréstimos do cliente
    const { data: loansData } = await supabase.from('loans').select('id').eq('client_id', id);
    if (loansData && loansData.length > 0) {
      for (const loan of loansData) {
        await deleteLoanCascade(loan.id);
      }
    }
    // Exclui recibos do cliente
    await supabase.from('receipts').delete().eq('client_id', id);
    // Exclui o cliente
    return await deleteClient(id);
  }

  async function fixAllLoanStatuses() {
    for (const loan of loans) {
      const status = getLoanStatus(loan, receipts, payments);
      if (loan.status !== status) {
        await updateLoan(loan.id, { status });
      }
    }
    await refetchLoans();
  }

  const value = {
    clients,
    loans,
    receipts,
    payments,
    isLoaded,
    refetchClients,
    refetchLoans,
    refetchReceipts,
    refetchPayments,
    addClient,
    addLoan,
    addReceipt,
    updateClient,
    updateLoan,
    deleteClient,
    deleteLoan,
    deleteReceipt,
    addPayment, // <-- novo
    deleteClientCascade,
    deleteLoanCascade,
    fixAllLoanStatuses,
  };

  useEffect(() => {
    (async () => {
      await Promise.all([
        refetchClients(),
        refetchLoans(),
        refetchReceipts(),
        refetchPayments(),
      ]);
      setIsLoaded(true);
    })();

    // Real-time listeners Supabase
    const clientSub = supabase
      .channel('public:clients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        refetchClients();
      })
      .subscribe();
    const loanSub = supabase
      .channel('public:loans')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, () => {
        refetchLoans();
      })
      .subscribe();
    const receiptSub = supabase
      .channel('public:receipts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receipts' }, () => {
        refetchReceipts();
      })
      .subscribe();
    const paymentSub = supabase
      .channel('public:payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        refetchPayments();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(clientSub);
      supabase.removeChannel(loanSub);
      supabase.removeChannel(receiptSub);
      supabase.removeChannel(paymentSub);
    };
  }, []);

  if (!isLoaded) {
    return <div>Carregando dados...</div>;
  }

  return (
    <LocalDataContext.Provider value={value}>
      {children}
    </LocalDataContext.Provider>
  );
}

export function useLocalData() {
  const context = useContext(LocalDataContext);
  if (context === undefined) {
    throw new Error('useLocalData must be used within a LocalDataProvider');
  }
  return context;
}

export function useSupabase() {
  const context = useContext(LocalDataContext);
  if (context === undefined) {
    throw new Error('useSupabase deve ser usado dentro de LocalDataProvider');
  }
  return context;
}

function mapClientFromDb(db: any): Client {
  return {
    id: db.id,
    name: db.name,
    email: db.email,
    phone: db.phone,
    cpf: db.cpf,
    address: db.address,
    city: db.city,
    state: db.state,
    zipCode: db.zip_code,
    notes: db.notes ?? undefined,
    createdAt: db.created_at,
  };
}
function mapClientToDb(client: Omit<Client, 'id' | 'createdAt'>) {
  return {
    name: client.name,
    email: client.email || '',
    phone: client.phone,
    cpf: client.cpf || '',
    address: client.address || '',
    city: client.city || '',
    state: client.state || '',
    notes: client.notes || '',
  };
}
// LOANS
function mapLoanFromDb(db: any): Loan {
  return {
    id: db.id,
    clientId: db.client_id,
    amount: db.amount,
    interestRate: db.interest_rate,
    totalAmount: db.total_amount,
    installments: db.installments,
    installmentAmount: db.installment_amount,
    dueDate: db.due_date,
    endDate: db.end_date,
    status: db.status,
    notes: db.notes ?? undefined,
    createdAt: db.created_at,
    paymentType: db.payment_type,
    // campos opcionais
    payments: db.payments,
    numberOfInstallments: db.installments,
    interestAmount: db.interest_amount,
    startDate: db.start_date,
  };
}
function mapLoanToDb(loan: Omit<Loan, 'id' | 'createdAt'>) {
  // Garante que datas estejam no formato ISO (YYYY-MM-DD)
  function toISODate(date: any) {
    if (!date) return undefined;
    if (typeof date === 'string') {
      // Se já está no formato ISO, retorna
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
      // Se está no formato brasileiro, converte
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        const [dia, mes, ano] = date.split('/');
        return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      }
      // Tenta converter para Date e pegar toISOString
      const d = new Date(date);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      return undefined;
    }
    if (date instanceof Date) {
      return date.toISOString().slice(0, 10);
    }
    return undefined;
  }
  return {
    client_id: loan.clientId,
    amount: loan.amount,
    interest_rate: loan.interestRate ?? 0,
    total_amount: loan.totalAmount ?? loan.amount,
    installments: loan.installments ?? 1,
    installment_amount: loan.installmentAmount ?? loan.amount,
    due_date: toISODate(loan.dueDate),
    end_date: toISODate(loan.endDate),
    status: loan.status ?? 'active',
    notes: loan.notes ?? null,
    payment_type: loan.paymentType,
    start_date: toISODate(loan.startDate) ?? new Date().toISOString().slice(0, 10),
  };
}
// RECEIPTS
function mapReceiptFromDb(db: any): Receipt {
  return {
    id: db.id,
    clientId: db.client_id,
    loanId: db.loan_id,
    paymentId: db.payment_id,
    amount: db.amount,
    date: db.date,
    dueDate: db.due_date,
    receiptNumber: db.receipt_number,
    createdAt: db.created_at,
  };
}
function mapReceiptToDb(receipt: Omit<Receipt, 'id' | 'createdAt'>) {
  return {
    client_id: receipt.clientId,
    loan_id: receipt.loanId,
    payment_id: receipt.paymentId,
    amount: receipt.amount,
    date: receipt.date,
    due_date: receipt.dueDate,
    receipt_number: receipt.receiptNumber,
  };
}