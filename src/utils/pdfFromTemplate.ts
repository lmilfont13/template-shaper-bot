import jsPDF from 'jspdf';
import { getStorageUrl } from './supabaseStorage';

interface TemplateDocumentData {
  employee_name: string;
  template_name: string;
  processedText: string;
  company_logo_url?: string;
  signature_url?: string;
  stamp_url?: string;
  coligada_endereco?: string;
  created_at: string;
}

/**
 * Converte o conteúdo do template em um PDF de alta qualidade usando comandos nativos.
 * Prioriza nitidez vetorial e alinhamento padrão (25mm).
 */
export const generatePDFFromTemplate = async (data: TemplateDocumentData, returnBlob: boolean = false): Promise<void | Blob> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const leftMargin = 25;
  const rightMargin = 20;
  const topMargin = 25;
  const contentWidth = pageWidth - leftMargin - rightMargin;
  let yPosition = topMargin;

  // 1. Resolver URLs
  const logoUrl = await getStorageUrl(data.company_logo_url);
  const signatureUrl = await getStorageUrl(data.signature_url);
  const stampUrl = await getStorageUrl(data.stamp_url);

  // 2. Cabeçalho (Logo e Data)
  if (logoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = logoUrl;
      });
      const imgWidth = 35;
      const imgHeight = (img.height * imgWidth) / img.width;
      pdf.addImage(img, 'PNG', leftMargin, yPosition, imgWidth, imgHeight);
      // yPosition permanece para a data no mesmo nível
    } catch (e) {
      console.error('Erro ao carregar logo no PDF:', e);
    }
  }

  // Data alinhada à direita no topo
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  const date = new Date(data.created_at);
  const dateStr = `Data de emissão: ${date.toLocaleDateString('pt-BR')}`;
  pdf.text(dateStr, pageWidth - rightMargin, yPosition + 5, { align: 'right' });

  yPosition += 40; // Espaço após cabeçalho

  // 3. Processar o Texto (Ancoragem por Placeholder)
  const cleanText = data.processedText
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, ''); 

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);

  const lines = pdf.splitTextToSize(cleanText, contentWidth);
  let signaturePlaced = false;
  let stampPlaced = false;

  const IMG_SIZE = 40;
  
  // 1. Encontrar as coordenadas de cada placeholder
  yPosition = topMargin + 40; // Reset para busca
  const anchors: { type: 'sig' | 'stamp', x: number, y: number }[] = [];
  
  lines.forEach((line: string) => {
    if (yPosition > pageHeight - 40) { yPosition = topMargin; }
    
    if (line.toLowerCase().includes('{{assinatura}}')) {
      const textBefore = line.split(/\{\{assinatura\}\}/i)[0];
      anchors.push({ type: 'sig', x: leftMargin + pdf.getTextWidth(textBefore), y: yPosition });
    }
    if (line.toLowerCase().includes('{{carimbo}}')) {
      const textBefore = line.split(/\{\{carimbo\}\}/i)[0];
      anchors.push({ type: 'stamp', x: leftMargin + pdf.getTextWidth(textBefore), y: yPosition });
    }
    yPosition += 6;
  });

  // 2. Renderizar o texto sem os placeholders
  yPosition = topMargin + 40;
  lines.forEach((line: string) => {
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = topMargin;
    }
    const lineToPrint = line.replace(/\{\{assinatura\}\}/gi, '').replace(/\{\{carimbo\}\}/gi, '');
    pdf.text(lineToPrint, leftMargin, yPosition);
    yPosition += 6;
  });

  // 3. Adicionar as imagens nas ancoras encontradas
  for (const anchor of anchors) {
    const url = anchor.type === 'sig' ? signatureUrl : stampUrl;
    if (url) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });
        const h = (img.height * IMG_SIZE) / img.width;
        // Posicionar centralizado verticalmente na linha ou levemente acima
        pdf.addImage(img, 'PNG', anchor.x, anchor.y - (h / 2), IMG_SIZE, h);
      } catch (e) {}
    }
  }

  // 4. Fallback se não foram encontrados placeholders
  if (anchors.length === 0 && (signatureUrl || stampUrl)) {
    yPosition += 10;
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = topMargin;
    }

    if (signatureUrl) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = signatureUrl;
        });
        const h = (img.height * IMG_SIZE) / img.width;
        pdf.addImage(img, 'PNG', leftMargin, yPosition, IMG_SIZE, h);
      } catch (e) {}
    }

    if (stampUrl) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = stampUrl;
        });
        const h = (img.height * IMG_SIZE) / img.width;
        pdf.addImage(img, 'PNG', leftMargin + 50, yPosition, IMG_SIZE, h);
      } catch (e) {}
    }
  }

  // 5. Rodapé (Endereço)
  const footerY = pageHeight - 15;
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text(data.coligada_endereco || '', pageWidth / 2, footerY, { align: 'center' });
  pdf.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, footerY + 4, { align: 'center' });

  // 6. Retorno
  const fileName = `${data.employee_name.replace(/\s+/g, '_')}_${data.template_name.replace(/\s+/g, '_')}.pdf`;
  
  if (returnBlob) {
    return pdf.output('blob');
  } else {
    pdf.save(fileName);
  }
};
