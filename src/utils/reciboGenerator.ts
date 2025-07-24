import { format } from 'date-fns';

interface ReciboData {
  docNumero: string;
  cliente: string;
  vencimento: string;
  valorPagoHoje: number;
  parcelaAtual?: number;
  totalParcelas?: number;
  pagoConfirmado: number;
  dataGeracao: Date;
  dataPagamento: Date; // Novo campo para data de pagamento
}

export function gerarRecibo(data: ReciboData): string {
  const {
    docNumero,
    cliente,
    vencimento,
    valorPagoHoje,
    parcelaAtual,
    totalParcelas,
    pagoConfirmado,
    dataGeracao,
    dataPagamento // Novo campo
  } = data;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Exibe info de parcelas pagas sempre que ambos existirem e parcelaAtual não for undefined ou null
  const parcelasPagasInfo = (typeof parcelaAtual === 'number' && typeof totalParcelas === 'number')
    ? `Parcelas pagas: ${parcelaAtual}/${totalParcelas}`
    : '';

  // Monta o recibo, evitando linha em branco extra se não houver parcelasPagasInfo
  return `RECIBO DE PAGAMENTO - Doc Nº ${docNumero}

Cliente: ${cliente}
Vencimento: ${vencimento}
Data de pagamento: ${format(dataPagamento, 'dd/MM/yyyy')}
${parcelasPagasInfo ? parcelasPagasInfo + '\n' : ''}Pago confirmado: ${formatCurrency(pagoConfirmado)}
Valor pago hoje: ${formatCurrency(valorPagoHoje)}
--------------------------

Gerado em: ${format(dataGeracao, 'dd/MM/yyyy HH:mm')}

ATENÇÃO:
Os dados acima informados são apenas para simples conferência e não servem como comprovante de pagamento.`;
}
