import jsPDF from 'jspdf';

interface DocumentData {
  employee_name: string;
  template_name: string;
  data: Record<string, any>;
  company_logo_url?: string;
  created_at: string;
}

const fieldLabels: Record<string, string> = {
  nome: 'Nome',
  nome_colaborador: 'Nome do Colaborador',
  loja: 'Loja',
  nome_loja: 'Nome da Loja',
  rg: 'RG',
  cpf: 'CPF',
  data_emissao: 'Data de Emissão',
  data_carta: 'Data da Carta',
  funcao: 'Função',
  cargo: 'Cargo',
  empresa: 'Empresa',
  email: 'E-mail',
  telefone: 'Telefone',
  departamento: 'Departamento',
  data_admissao: 'Data de Admissão',
  salario: 'Salário',
  endereco: 'Endereço',
  cidade: 'Cidade',
  estado: 'Estado',
  cep: 'CEP',
  contato_emergencia: 'Contato de Emergência',
  telefone_emergencia: 'Telefone de Emergência',
};

export const generatePDF = async (document: DocumentData): Promise<void> => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = 20;

  // Adicionar logo se existir
  if (document.company_logo_url) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = document.company_logo_url!;
      });
      
      const imgWidth = 40;
      const imgHeight = (img.height * imgWidth) / img.width;
      pdf.addImage(img, 'PNG', pageWidth - margin - imgWidth, yPosition, imgWidth, imgHeight);
    } catch (error) {
      console.error('Erro ao carregar logo:', error);
    }
  }

  // Título do documento
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(document.template_name, margin, yPosition);
  yPosition += 10;

  // Nome do funcionário
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Funcionário: ${document.employee_name}`, margin, yPosition);
  yPosition += 15;

  // Linha divisória
  pdf.setDrawColor(0, 0, 0);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Dados do documento
  pdf.setFontSize(11);
  const data = document.data || {};
  
  Object.entries(data).forEach(([key, value]) => {
    if (value && value !== '') {
      const label = fieldLabels[key] || key;
      const text = `${label}: ${value}`;
      
      // Verificar se precisa de nova página
      if (yPosition > pdf.internal.pageSize.getHeight() - 30) {
        pdf.addPage();
        yPosition = 20;
      }
      
      // Label em negrito
      pdf.setFont('helvetica', 'bold');
      pdf.text(label + ':', margin, yPosition);
      
      // Valor em normal
      pdf.setFont('helvetica', 'normal');
      const lines = pdf.splitTextToSize(String(value), pageWidth - margin * 2 - 40);
      pdf.text(lines, margin + 40, yPosition);
      
      yPosition += 7 * lines.length;
    }
  });

  // Rodapé
  yPosition = pdf.internal.pageSize.getHeight() - 20;
  pdf.setFontSize(9);
  pdf.setTextColor(128, 128, 128);
  const date = new Date(document.created_at);
  const dateStr = date.toLocaleDateString('pt-BR');
  const timeStr = date.toLocaleTimeString('pt-BR');
  pdf.text(`Documento gerado em ${dateStr} às ${timeStr}`, margin, yPosition);

  // Fazer download
  const fileName = `${document.employee_name.replace(/\s+/g, '_')}_${document.template_name.replace(/\s+/g, '_')}.pdf`;
  pdf.save(fileName);
};
