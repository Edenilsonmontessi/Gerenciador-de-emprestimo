import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Download, User, CreditCard } from 'lucide-react';
import { useLocalData } from '../contexts/SupabaseContext';
import { Client, Loan, Receipt } from '../types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { receipts, clients, loans } = useLocalData();
  
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loan, setLoan] = useState<Loan | null>(null);

  useEffect(() => {
    if (id) {
      const foundReceipt = receipts.find(r => r.id === id);
      if (foundReceipt) {
        setReceipt(foundReceipt);
        
        // Find client and loan
        const foundClient = clients.find(c => c.id === foundReceipt.clientId);
        const foundLoan = loans.find(l => l.id === foundReceipt.loanId);
        
        if (foundClient) setClient(foundClient);
        if (foundLoan) setLoan(foundLoan);
      } else {
        navigate('/receipts');
      }
    }
  }, [id, receipts, clients, loans, navigate]);

  // Função auxiliar para montar o conteúdo do PDF
  function montarConteudoPDF(receipt: Receipt, client: Client, loan: Loan) {
    const parcela = loan.payments?.find(p => p.id === receipt.paymentId)?.installmentNumber || '-';
    const totalParcelas = loan.installments || '-';
    const valorParcela = receipt.amount;
    return [
      `Cliente: ${client.name}`,
      `Vencimento: ${new Date(receipt.date).toLocaleDateString('pt-BR')}`,
      `Data de pagamento: ${new Date(receipt.date).toLocaleDateString('pt-BR')}`,
      `Parcela paga: ${parcela}/${totalParcelas} - Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorParcela)}`
    ];
  }

  const generatePDF = () => {
    if (!receipt || !client || !loan) return;
    const doc = new jsPDF();
    
    // Add content to PDF
    doc.setFontSize(18);
    doc.text('Recibo virtual', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Doc Nº${receipt.receiptNumber}`, 105, 30, { align: 'center' });
    
    doc.setFontSize(10);
    const content = montarConteudoPDF(receipt, client, loan);
    
    content.forEach((line, index) => {
      doc.text(line, 20, 50 + (index * 10));
    });
    
    // Save the PDF
    const filename = `recibo_${client.name.toLowerCase().replace(/\s+/g, '_')}_${receipt.receiptNumber}.pdf`;
    doc.save(filename);
  };

  const printReceipt = () => {
    window.print();
  };

  const downloadReceipt = () => {
    generatePDF();
  };

  // Adicionar checagem de null antes de acessar receipt/client
  if (!receipt || !client || !loan) {
    return <div className="p-4 text-center">Carregando...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/receipts')}
            className="text-gray-500 hover:text-gray-700 flex items-center"
          >
            <ArrowLeft size={20} className="mr-1" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Recibo #{receipt.receiptNumber}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadReceipt}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Download size={18} />
            Download PDF
          </button>
        </div>
      </div>

      {/* Receipt Preview */}
      <div className="bg-white shadow-sm rounded-lg p-8 max-w-3xl mx-auto">
        <div className="border-2 border-gray-200 p-8 rounded-lg">
          {/* Receipt Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">RECIBO DE PAGAMENTO</h2>
            <p className="text-sm text-gray-500">Dinheiro Rápido - Sistema de Controle de Empréstimos</p>
          </div>
          
          {/* Receipt Info */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              <span className="font-medium">Nº do Recibo:</span>
              <span>{receipt.receiptNumber}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="font-medium">Data:</span>
              <span>{new Date(receipt.date).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="font-medium">Parcela paga:</span>
              <span className="font-semibold">{loan.payments?.find(p => p.id === receipt.paymentId)?.installmentNumber || '-'} / {loan.installments || '-'}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="font-medium">Valor pago:</span>
              <span className="font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receipt.amount)}</span>
            </div>
          </div>
          
          {/* Receipt Divider */}
          <div className="border-t-2 border-gray-200 my-6"></div>
          
          {/* Receipt Body */}
          <div className="mb-8">
            <p className="mb-4">
              Recebi(emos) de <span className="font-semibold">{client.name}</span>, 
              inscrito(a) no CPF sob o nº <span className="font-semibold">{client.cpf}</span>, 
              o valor de <span className="font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receipt.amount)}</span> 
              (<span className="font-semibold">{valorPorExtenso(receipt.amount)}</span>), 
              referente ao pagamento da parcela <span className="font-semibold">{loan.payments?.find(p => p.id === receipt.paymentId)?.installmentNumber || '-'} / {loan.installments || '-'}</span> do empréstimo.
            </p>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Nº do Empréstimo:</p>
                  <p className="font-medium">{loan.id.slice(-4)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Parcela paga:</p>
                  <p className="font-medium">
                    {loan.payments?.find(p => p.id === receipt.paymentId)?.installmentNumber || '-'} de {loan.installments || '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Receipt Footer */}
          <div className="mt-12 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p>Para maior clareza, firmo o presente recibo para todos os fins.</p>
              <div className="mt-8 pt-8 border-t border-gray-300 max-w-xs mx-auto">
                <p className="text-sm text-gray-500">Assinatura do Responsável</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="mt-6 flex flex-col md:flex-row gap-4 justify-center">
        <Link 
          to={`/clients/${client.id}`}
          className="btn flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          <User size={18} />
          Ver Cliente
        </Link>
        <Link 
          to={`/loans/${loan.id}`}
          className="btn flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          <CreditCard size={18} />
          Ver Empréstimo
        </Link>
        <button
          onClick={printReceipt}
          className="btn flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          <Printer size={18} />
          Imprimir
        </button>
      </div>
    </div>
  );
}

// Função para converter valor para extenso
function valorPorExtenso(valor: number): string {
  if (valor === 0) return 'zero reais';
  
  // Simplificação para fins de demonstração
  const reais = Math.floor(valor);
  const centavos = Math.round((valor - reais) * 100);
  
  let extenso = '';
  
  if (reais > 0) {
    if (reais === 1) {
      extenso += 'um real';
    } else {
      // Simplificação - implementação real seria mais complexa
      extenso += `${reais} reais`;
    }
  }
  
  if (centavos > 0) {
    if (extenso !== '') extenso += ' e ';
    
    if (centavos === 1) {
      extenso += 'um centavo';
    } else {
      extenso += `${centavos} centavos`;
    }
  }
  
  return extenso;
}

