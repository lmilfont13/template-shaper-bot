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
      
      const imgWidth = 45;
      const imgHeight = (img.height * imgWidth) / img.width;
      pdf.addImage(img, 'PNG', margin, yPosition, imgWidth, imgHeight);
      logoHeight = imgHeight;
    } catch (error) {
      console.error('Erro ao carregar logo:', error);
    }
  }

  // Adicionar data de emissão no canto superior direito
  pdf.setFontSize(9);
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
  yPosition = Math.max(margin + logoHeight + 12, dateY + 15);

  // Remover placeholders de imagens do texto
  let contentText = data.processedText;
  contentText = contentText.replace(/{{assinatura}}/gi, '');
  contentText = contentText.replace(/{{carimbo}}/gi, '');

  // Conteúdo do documento com formatação de carta
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  // Calcular espaço disponível para texto (reservar espaço para assinatura/carimbo)
  const maxTextHeight = pageHeight - yPosition - 65; // 65 para assinatura/carimbo
  
  // Dividir texto em linhas respeitando a largura da página
  const maxWidth = pageWidth - (margin * 2);
  const lines = pdf.splitTextToSize(contentText, maxWidth);
  
  // Ajustar espaçamento entre linhas para caber em uma página
  const lineSpacing = Math.min(5, maxTextHeight / lines.length);

  for (const line of lines) {
    // Parar se ultrapassar o espaço disponível
    if (yPosition > pageHeight - 70) {
      break;
    }
    
    pdf.text(line, margin, yPosition);
    yPosition += lineSpacing;
  }

  // Posicionar assinatura e carimbo no final da página
  const bottomY = pageHeight - 55;

  // Assinatura no canto inferior esquerdo (menor conforme layout)
  if (data.signature_url) {
    try {
      const signatureImg = new Image();
      signatureImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        signatureImg.onload = resolve;
        signatureImg.onerror = reject;
        signatureImg.src = data.signature_url!;
      });
      
      const signatureWidth = 40;
      const signatureHeight = (signatureImg.height * signatureWidth) / signatureImg.width;
      const signatureX = margin + 5;
      pdf.addImage(signatureImg, 'PNG', signatureX, bottomY, signatureWidth, signatureHeight);
    } catch (error) {
      console.error('Erro ao carregar assinatura:', error);
    }
  }

  // Carimbo no canto inferior direito (maior que assinatura conforme layout)
  if (data.stamp_url) {
    try {
      const stampImg = new Image();
      stampImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        stampImg.onload = resolve;
        stampImg.onerror = reject;
        stampImg.src = data.stamp_url!;
      });
      
      const stampWidth = 55;
      const stampHeight = (stampImg.height * stampWidth) / stampImg.width;
      const stampX = pageWidth - margin - stampWidth - 5;
      pdf.addImage(stampImg, 'PNG', stampX, bottomY - 5, stampWidth, stampHeight);
    } catch (error) {
      console.error('Erro ao carregar carimbo:', error);
    }
  }

  // Rodapé com informações
  pdf.setFontSize(7);
  pdf.setTextColor(150, 150, 150);
  const footerDate = new Date(data.created_at);
  const footerDateStr = footerDate.toLocaleDateString('pt-BR');
  const footerTimeStr = footerDate.toLocaleTimeString('pt-BR');
  pdf.text(
    `Gerado em ${footerDateStr} às ${footerTimeStr}`, 
    margin, 
    pageHeight - 5
  );

  // Fazer download
  const fileName = `${data.employee_name.replace(/\s+/g, '_')}_${data.template_name.replace(/\s+/g, '_')}.pdf`;
  pdf.save(fileName);
};
