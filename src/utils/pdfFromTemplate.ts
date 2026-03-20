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

  // 3. Processar o Texto (Limpar HTML básico do editor para garantir nitidez)
  // O editor rico gera HTML. Para máxima nitidez vetorial, convertemos para texto puro
  // mas mantendo quebras de linha.
  let cleanText = data.processedText
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, ''); // Remove outras tags

  // Remover placeholders de imagem do texto para não aparecerem como texto bruto
  cleanText = cleanText.replace(/\{\{assinatura\}\}/gi, '').replace(/\{\{carimbo\}\}/gi, '');

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);

  const lines = pdf.splitTextToSize(cleanText, contentWidth);
  
  // Renderizar linhas respeitando as margens
  lines.forEach((line: string) => {
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = topMargin;
    }
    pdf.text(line, leftMargin, yPosition);
    yPosition += 6; // Espaçamento entre linhas
  });

  yPosition += 15;

  // 4. Assinatura e Carimbo no final
  if (signatureUrl || stampUrl) {
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = topMargin;
    }

    const imgSize = 40;
    
    if (signatureUrl) {
      try {
        const sigImg = new Image();
        sigImg.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          sigImg.onload = resolve;
          sigImg.onerror = reject;
          sigImg.src = signatureUrl;
        });
        const sigH = (sigImg.height * imgSize) / sigImg.width;
        pdf.addImage(sigImg, 'PNG', leftMargin, yPosition, imgSize, sigH);
      } catch (e) {}
    }

    if (stampUrl) {
      try {
        const stampImg = new Image();
        stampImg.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          stampImg.onload = resolve;
          stampImg.onerror = reject;
          stampImg.src = stampUrl;
        });
        const stH = (stampImg.height * imgSize) / stampImg.width;
        pdf.addImage(stampImg, 'PNG', leftMargin + 60, yPosition, imgSize, stH);
      } catch (e) {}
    }
    
    yPosition += 50;
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
