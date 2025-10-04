import jsPDF from 'jspdf';

interface TemplateDocumentData {
  employee_name: string;
  template_name: string;
  processedText: string;
  company_logo_url?: string;
  created_at: string;
}

export const generatePDFFromTemplate = async (data: TemplateDocumentData): Promise<void> => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = 20;

  // Adicionar logo se existir
  if (data.company_logo_url) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = data.company_logo_url!;
      });
      
      const imgWidth = 40;
      const imgHeight = (img.height * imgWidth) / img.width;
      pdf.addImage(img, 'PNG', pageWidth - margin - imgWidth, yPosition, imgWidth, imgHeight);
    } catch (error) {
      console.error('Erro ao carregar logo:', error);
    }
  }

  // Título do documento
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.template_name, margin, yPosition);
  yPosition += 15;

  // Linha divisória
  pdf.setDrawColor(0, 0, 0);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Conteúdo do template processado
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');

  // Dividir texto em linhas respeitando a largura da página
  const maxWidth = pageWidth - (margin * 2);
  const lines = pdf.splitTextToSize(data.processedText, maxWidth);

  for (const line of lines) {
    // Verificar se precisa de nova página
    if (yPosition > pageHeight - 30) {
      pdf.addPage();
      yPosition = 20;
    }
    
    pdf.text(line, margin, yPosition);
    yPosition += 7;
  }

  // Rodapé
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.setTextColor(128, 128, 128);
    const date = new Date(data.created_at);
    const dateStr = date.toLocaleDateString('pt-BR');
    const timeStr = date.toLocaleTimeString('pt-BR');
    pdf.text(`Documento gerado em ${dateStr} às ${timeStr} - Página ${i} de ${totalPages}`, margin, pageHeight - 10);
  }

  // Fazer download
  const fileName = `${data.employee_name.replace(/\s+/g, '_')}_${data.template_name.replace(/\s+/g, '_')}.pdf`;
  pdf.save(fileName);
};
