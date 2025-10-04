import jsPDF from 'jspdf';

interface TemplateDocumentData {
  employee_name: string;
  template_name: string;
  processedText: string;
  company_logo_url?: string;
  signature_url?: string;
  stamp_url?: string;
  created_at: string;
}

export const generatePDFFromTemplate = async (data: TemplateDocumentData): Promise<void> => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = 20;

  // Adicionar logo no canto superior esquerdo
  let logoHeight = 0;
  if (data.company_logo_url) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = data.company_logo_url!;
      });
      
      const imgWidth = 50;
      const imgHeight = (img.height * imgWidth) / img.width;
      pdf.addImage(img, 'PNG', margin, yPosition, imgWidth, imgHeight);
      logoHeight = imgHeight;
    } catch (error) {
      console.error('Erro ao carregar logo:', error);
    }
  }

  // Adicionar data de emissão no canto superior direito
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const date = new Date(data.created_at);
  const dateStr = date.toLocaleDateString('pt-BR');
  const dateText = `Data de emissão:\n${dateStr}`;
  const dateLines = dateText.split('\n');
  const dateY = yPosition + 5;
  dateLines.forEach((line, index) => {
    const textWidth = pdf.getTextWidth(line);
    pdf.text(line, pageWidth - margin - textWidth, dateY + (index * 5));
  });

  // Ajustar yPosition para começar após a logo
  yPosition = Math.max(margin + logoHeight + 15, dateY + 20);

  // Remover placeholders de imagens do texto
  let contentText = data.processedText;
  contentText = contentText.replace(/{{assinatura}}/gi, '');
  contentText = contentText.replace(/{{carimbo}}/gi, '');

  // Conteúdo do documento com formatação de carta
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');

  // Dividir texto em linhas respeitando a largura da página
  const maxWidth = pageWidth - (margin * 2);
  const lines = pdf.splitTextToSize(contentText, maxWidth);

  for (const line of lines) {
    // Verificar se precisa de nova página (reservar espaço para assinatura e carimbo)
    if (yPosition > pageHeight - 80) {
      pdf.addPage();
      yPosition = 20;
    }
    
    pdf.text(line, margin, yPosition);
    yPosition += 6;
  }

  // Espaço antes das assinaturas
  yPosition += 20;

  // Verificar se há espaço para assinaturas, caso contrário criar nova página
  if (yPosition > pageHeight - 70) {
    pdf.addPage();
    yPosition = 20;
  }

  // Assinatura no canto inferior esquerdo
  if (data.signature_url && data.processedText.match(/{{assinatura}}/gi)) {
    try {
      const signatureImg = new Image();
      signatureImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        signatureImg.onload = resolve;
        signatureImg.onerror = reject;
        signatureImg.src = data.signature_url!;
      });
      
      const signatureWidth = 50;
      const signatureHeight = (signatureImg.height * signatureWidth) / signatureImg.width;
      const signatureX = margin;
      const signatureY = Math.max(yPosition, pageHeight - 70);
      pdf.addImage(signatureImg, 'PNG', signatureX, signatureY, signatureWidth, signatureHeight);
    } catch (error) {
      console.error('Erro ao carregar assinatura:', error);
    }
  }

  // Carimbo no canto inferior direito
  if (data.stamp_url && data.processedText.match(/{{carimbo}}/gi)) {
    try {
      const stampImg = new Image();
      stampImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        stampImg.onload = resolve;
        stampImg.onerror = reject;
        stampImg.src = data.stamp_url!;
      });
      
      const stampWidth = 60;
      const stampHeight = (stampImg.height * stampWidth) / stampImg.width;
      const stampX = pageWidth - margin - stampWidth;
      const stampY = Math.max(yPosition, pageHeight - 70);
      pdf.addImage(stampImg, 'PNG', stampX, stampY, stampWidth, stampHeight);
    } catch (error) {
      console.error('Erro ao carregar carimbo:', error);
    }
  }

  // Rodapé com informações (remover paginação)
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    const footerDate = new Date(data.created_at);
    const footerDateStr = footerDate.toLocaleDateString('pt-BR');
    const footerTimeStr = footerDate.toLocaleTimeString('pt-BR');
    pdf.text(
      `Documento gerado em ${footerDateStr} às ${footerTimeStr}`, 
      margin, 
      pageHeight - 5
    );
  }

  // Fazer download
  const fileName = `${data.employee_name.replace(/\s+/g, '_')}_${data.template_name.replace(/\s+/g, '_')}.pdf`;
  pdf.save(fileName);
};
