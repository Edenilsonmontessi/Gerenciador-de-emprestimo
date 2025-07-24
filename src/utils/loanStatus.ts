// Função utilitária para calcular status do empréstimo
import { Loan, Receipt, Payment } from '../types';

export function getLoanStatus(
  loan: Loan,
  receipts: Receipt[] = [],
  payments: Payment[] = []
): 'active' | 'completed' {
  // Garante comparação de datas apenas por dia (ignorando hora)
  const today = new Date();
  today.setHours(0,0,0,0);
  const dueDate = loan.dueDate ? new Date(loan.dueDate) : null;
  if (dueDate) dueDate.setHours(0,0,0,0);
  // Soma todos os valores recebidos (recibos e pagamentos) referentes ao empréstimo
  const totalRecebido = [
    ...receipts.filter((r) => r.loanId === loan.id).map(r => r.amount || 0),
    ...payments.filter((p) => p.loanId === loan.id).map(p => p.amount || 0)
  ].reduce((sum, value) => sum + value, 0);

  // Ajuste: saldo a receber por modalidade
  let saldoAReceber = 0;
  if (loan.paymentType === 'interest_only') {
    const quitado = payments?.some(p => p.type === 'full');
    saldoAReceber = quitado ? 0 : loan.totalAmount;
  } else if (loan.paymentType === 'diario') {
    const quitado = payments?.some(p => p.type === 'full');
    saldoAReceber = quitado ? 0 : Math.max((loan.installments && loan.installmentAmount)
      ? loan.installments * loan.installmentAmount - totalRecebido
      : loan.totalAmount - totalRecebido, 0);
  } else {
    saldoAReceber = Math.max((loan.installments && loan.installmentAmount)
      ? loan.installments * loan.installmentAmount - totalRecebido
      : loan.totalAmount - totalRecebido, 0);
  }

  // Só marca como concluído se o total pago for igual ao total com juros
  const totalComJuros = ((loan.paymentType === 'diario' || loan.paymentType === 'installments') && loan.installments && loan.installmentAmount)
    ? loan.installments * loan.installmentAmount
    : loan.totalAmount;

  // Lógica para status dos recibos individuais
  // Se o total recebido for igual ou maior ao total com juros, empréstimo está concluído
  // Na modalidade 'somente juros', só conclui se houver pagamento do tipo 'full'
  if (loan.paymentType === 'interest_only') {
    const pagamentos = payments?.filter(p => p.loanId === loan.id) || [];
    const quitado = pagamentos.some(p => p.type === 'full');
    return quitado ? 'completed' : 'active';
  }
  // Para modalidade 'diário', só marca como concluído se todas as parcelas forem pagas e o total recebido for igual ao total esperado
  if (loan.paymentType === 'diario') {
    const recibosDoEmprestimo = receipts.filter((r) => r.loanId === loan.id);
    const totalRecibos = recibosDoEmprestimo.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalParcelas = loan.installments || loan.numberOfInstallments || 0;
    if (recibosDoEmprestimo.length === totalParcelas && totalRecibos >= totalComJuros) {
      return 'completed';
    }
    return 'active';
  }
  // Para as demais modalidades, considera recibos
  const recibosDoEmprestimo = receipts.filter((r) => r.loanId === loan.id);
  const totalRecibos = recibosDoEmprestimo.reduce((sum, r) => sum + (r.amount || 0), 0);
  // Só marca como concluído se houver pelo menos um recibo e o total for igual ou maior ao total com juros
  if (recibosDoEmprestimo.length > 0 && totalRecibos >= totalComJuros) {
    return 'completed';
  }
  return 'active';

  // Para status de cada recibo, a lógica deve ser aplicada na tela de detalhes
  // Exemplo para cada recibo:
  // - Se o recibo for o último e o total recebido >= totalComJuros, status = 'concluído'
  // - Senão, status = 'ativo'
}
