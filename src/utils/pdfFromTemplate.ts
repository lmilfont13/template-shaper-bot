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

export const generatePDFFromTemplate = async (data: TemplateDocumentData, returnBlob: boolean = false): Promise<void | Blob> => {
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

  // Não remover placeholders - vamos detectá-los e posicionar as imagens
  let contentText = data.processedText;

  // Conteúdo do documento com formatação de carta
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  // Dividir texto em linhas respeitando a largura da página
  const maxWidth = pageWidth - (margin * 2);
  const lines = pdf.splitTextToSize(contentText, maxWidth);
  
  const lineSpacing = 5;
  let signatureY = 0;
  let stampY = 0;
  const imageSize = 45; // Tamanho uniforme para ambas as imagens

  for (const line of lines) {
    if (yPosition > pageHeight - 50) {
      break;
    }
    
    // Detectar placeholders e marcar posições
    if (line.toLowerCase().includes('{{assinatura}}')) {
      signatureY = yPosition;
      // Não renderizar o placeholder
    } else if (line.toLowerCase().includes('{{carimbo}}')) {
      stampY = yPosition;
      // Não renderizar o placeholder
    } else {
      pdf.text(line, margin, yPosition);
    }
    
    yPosition += lineSpacing;
  }

  // Inserir assinatura na posição marcada
  if (data.signature_url && signatureY > 0) {
    try {
      const signatureImg = new Image();
      signatureImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        signatureImg.onload = resolve;
        signatureImg.onerror = reject;
        signatureImg.src = data.signature_url!;
      });
      
      const signatureHeight = (signatureImg.height * imageSize) / signatureImg.width;
      const signatureX = margin + 10;
      pdf.addImage(signatureImg, 'PNG', signatureX, signatureY, imageSize, signatureHeight);
    } catch (error) {
      console.error('Erro ao carregar assinatura:', error);
    }
  }

  // Inserir carimbo na posição marcada
  if (data.stamp_url && stampY > 0) {
    try {
      const stampImg = new Image();
      stampImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        stampImg.onload = resolve;
        stampImg.onerror = reject;
        stampImg.src = data.stamp_url!;
      });
      
      const stampHeight = (stampImg.height * imageSize) / stampImg.width;
      const stampX = pageWidth - margin - imageSize - 10;
      pdf.addImage(stampImg, 'PNG', stampX, stampY, imageSize, stampHeight);
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

  // Retornar blob ou fazer download
  const fileName = `${data.employee_name.replace(/\s+/g, '_')}_${data.template_name.replace(/\s+/g, '_')}.pdf`;
  
  if (returnBlob) {
    return pdf.output('blob');
  } else {
    pdf.save(fileName);
  }
};
