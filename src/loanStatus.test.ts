// Teste automatizado para lógica de status do empréstimo diário
// Requer jest instalado no projeto

interface Payment {
  id: string;
  type: 'interest_only' | 'full';
  amount: number;
}

interface Loan {
  paymentType: 'diario' | 'installments' | 'interest_only';
  installments?: number;
  numberOfInstallments?: number;
  payments: Payment[];
}

function isLoanCompletedDiario(loan: Loan): boolean {
  const totalPagamentos = loan.payments.length;
  const totalParcelas = loan.installments || loan.numberOfInstallments || 0;
  const hasQuitacao = loan.payments.some(p => p.type === 'full');
  return hasQuitacao || (totalParcelas > 0 && totalPagamentos >= totalParcelas);
}

describe('Empréstimo Diário - Status Concluído', () => {
  it('não deve concluir antes de todos os pagamentos', () => {
    const loan: Loan = {
      paymentType: 'diario',
      installments: 5,
      payments: [
        { id: '1', type: 'interest_only', amount: 10 },
        { id: '2', type: 'interest_only', amount: 10 },
      ],
    };
    expect(isLoanCompletedDiario(loan)).toBe(false);
  });

  it('deve concluir quando todos os pagamentos forem feitos', () => {
    const loan: Loan = {
      paymentType: 'diario',
      installments: 3,
      payments: [
        { id: '1', type: 'interest_only', amount: 10 },
        { id: '2', type: 'interest_only', amount: 10 },
        { id: '3', type: 'interest_only', amount: 10 },
      ],
    };
    expect(isLoanCompletedDiario(loan)).toBe(true);
  });

  it('deve concluir se houver quitação manual (pagamento full)', () => {
    const loan: Loan = {
      paymentType: 'diario',
      installments: 10,
      payments: [
        { id: '1', type: 'full', amount: 100 },
      ],
    };
    expect(isLoanCompletedDiario(loan)).toBe(true);
  });
});
