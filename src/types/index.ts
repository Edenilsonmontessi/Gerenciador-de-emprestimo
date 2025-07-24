export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  address: string;
  city: string;
  state: string;
  notes?: string;
  createdAt: string;
}

export interface Loan {
  id: string;
  clientId: string;
  amount: number;
  interestRate: number;
  totalAmount: number;
  installments: number;
  installmentAmount: number;
  dueDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'defaulted';
  notes?: string;
  createdAt: string;
  payments?: Payment[];
  paymentType: 'installments' | 'interest_only' | 'diario';
  // Campos opcionais para robustez e compatibilidade
  numberOfInstallments?: number;
  interestAmount?: number;
  startDate?: string;
}

export interface Payment {
  id: string;
  loanId: string;
  amount: number;
  date: string;
  installmentNumber: number;
  receiptId?: string;
  type: 'interest_only' | 'full';
  createdAt?: string;
}

export interface Receipt {
  id: string;
  clientId: string;
  loanId: string;
  paymentId: string;
  amount: number;
  date: string;
  dueDate: string;
  receiptNumber: string;
  createdAt: string;
}

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  clientId?: string;
  status?: string;
}

export interface DashboardStats {
  totalClients: number;
  activeLoans: number;
  totalLoaned: number;
  totalReceived: number;
  pendingAmount: number;
}