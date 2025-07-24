

import LoanCalendar from '../components/LoanCalendar';

export default function OverdueLoans() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Empréstimos por Data de Vencimento</h1>
      <LoanCalendar />
    </div>
  );
}