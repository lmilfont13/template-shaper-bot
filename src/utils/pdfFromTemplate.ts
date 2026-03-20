import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
 * Converte um texto (que pode ser HTML) em um PDF de alta qualidade.
 * Usa html2canvas para renderizar o conteúdo formatado.
 */
export const generatePDFFromTemplate = async (data: TemplateDocumentData, returnBlob: boolean = false): Promise<void | Blob> => {
  // 1. Resolver as URLs das imagens
  const logoUrl = await getStorageUrl(data.company_logo_url);
  const signatureUrl = await getStorageUrl(data.signature_url);
  const stampUrl = await getStorageUrl(data.stamp_url);

  // 2. Preparar o conteúdo HTML para renderização
  // Se o texto não for HTML (legacy), envolvemos em tags básicos
  let htmlContent = data.processedText;
  if (!htmlContent.includes('<p>') && !htmlContent.includes('<div>')) {
    htmlContent = `<div style="white-space: pre-wrap;">${htmlContent}</div>`;
  }

  // Substituir placeholders de assinatura e carimbo por imagens de alta qualidade
  if (signatureUrl && htmlContent.includes('{{assinatura}}')) {
    htmlContent = htmlContent.replace(/\{\{assinatura\}\}/gi, `<img src="${signatureUrl}" style="max-height: 80px; width: auto; object-fit: contain;" />`);
  } else {
    htmlContent = htmlContent.replace(/\{\{assinatura\}\}/gi, '');
  }

  if (stampUrl && htmlContent.includes('{{carimbo}}')) {
    htmlContent = htmlContent.replace(/\{\{carimbo\}\}/gi, `<img src="${stampUrl}" style="max-height: 80px; width: auto; object-fit: contain;" />`);
  } else {
    htmlContent = htmlContent.replace(/\{\{carimbo\}\}/gi, '');
  }

  // 3. Criar container temporário para o "Papel A4"
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '794px'; // Largura A4 em pixels (96 DPI)
  container.style.padding = '60px'; // Margens
  container.style.backgroundColor = 'white';
  container.style.color = 'black';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.fontSize = '14px';
  container.style.lineHeight = '1.6';

  const date = new Date(data.created_at);
  const dateStr = date.toLocaleDateString('pt-BR');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
      <div id="pdf-logo-container">
        ${logoUrl ? `<img src="${logoUrl}" style="max-height: 60px; width: auto;" />` : ''}
      </div>
      <div style="text-align: right; font-size: 11px; color: #666;">
        Data de emissão:<br/><strong>${dateStr}</strong>
      </div>
    </div>
    
    <div style="min-height: 700px; color: #111;">
      ${htmlContent}
    </div>
    
    <div style="margin-top: 50px; border-top: 1px solid #eee; padding-top: 15px; text-align: center;">
      <div style="font-size: 10px; color: #888;">
        ${data.coligada_endereco || ''}
      </div>
      <div style="font-size: 9px; color: #aaa; margin-top: 5px;">
        Documento gerado digitalmente em ${dateStr} às ${date.toLocaleTimeString('pt-BR')}
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // 4. Capturar como canvas
    const canvas = await html2canvas(container, {
      scale: 2, // Melhor qualidade
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    // 5. Retornar ou salvar
    const fileName = `${data.employee_name.replace(/\s+/g, '_')}_${data.template_name.replace(/\s+/g, '_')}.pdf`;
    
    if (returnBlob) {
      return pdf.output('blob');
    } else {
      pdf.save(fileName);
    }
  } catch (error) {
    console.error('Erro ao gerar imagem do PDF:', error);
    throw error;
  } finally {
    document.body.removeChild(container);
  }
};
