import { jsPDF } from 'jspdf';
import { fetchAndResolveImage } from './supabaseStorage';

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

const stripHtmlAndPlaceholders = (html: string) => {
  if (!html) return "";
  
  // 1. Remover placeholders primeiro para evitar que deixem linhas vazias
  let text = html.replace(/\{\{assinatura\}\}/gi, '');
  text = text.replace(/\{\{carimbo\}\}/gi, '');
  
  // 2. Tratar tags HTML transformando <p> em quebra de linha
  text = text.replace(/<p>/gi, '').replace(/<\/p>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/&nbsp;/g, ' ');
  
  // 3. Remover tags remanescentes
  const tmp = document.createElement("DIV");
  tmp.innerHTML = text;
  let cleanText = tmp.textContent || tmp.innerText || "";
  
  // 4. NORMALIZAR QUEBRAS DE LINHA (Remover o espaço excessivo)
  // Substitui 3 ou mais quebras de linha seguidas por apenas 2
  cleanText = cleanText.replace(/\n\s*\n\s*\n+/g, '\n\n');
  // Remove espaços no início e fim de cada linha e remove linhas vazias no topo/fundo
  return cleanText.trim();
};

export const generatePDFFromTemplate = async (data: TemplateDocumentData, returnBlob: boolean = false): Promise<void | Blob> => {
  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let y = 25; // Começa um pouco mais baixo para dar respiro no topo

  // 1. Logo
  if (data.company_logo_url) {
    try {
      const path = data.company_logo_url.includes('public/documents/') ? data.company_logo_url.split('public/documents/')[1] : data.company_logo_url;
      const url = await fetchAndResolveImage(path);
      if (url) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
        const imgW = 38; 
        const imgH = (img.height * imgW) / img.width;
        pdf.addImage(img, 'PNG', margin, y, imgW, imgH);
        y += imgH + 15; // Reduzido para compactar
      }
    } catch (e) { 
      y += 12; 
    }
  } else {
    y += 12; 
  }

  // 2. Data
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  const dateStr = new Date(data.created_at).toLocaleDateString('pt-BR');
  pdf.text(`Data de emissão: ${dateStr}`, pageWidth - margin, 18, { align: 'right' }); // Subi a data para 18
  pdf.setFont('helvetica', 'normal');

  // 3. Conteúdo
  const cleanText = stripHtmlAndPlaceholders(data.processedText);
  pdf.setFontSize(10.5); // Reduzi levemente a fonte para ajudar no encaixe
  
  const lineHeight = 6.8; // Altura de linha otimizada para página única
  const maxWidth = pageWidth - (margin * 2);
  
  const paragraphs = cleanText.split('\n');
  
  paragraphs.forEach((paragraph) => {
    const trimmed = paragraph.trim();
    if (trimmed === '') {
      y += lineHeight * 0.5;
      return;
    }
    
    if (trimmed.startsWith('A Loja:') || trimmed.startsWith('A/C:') || trimmed.startsWith('Ref.:')) {
        pdf.setFont('helvetica', 'bold');
    } else {
        pdf.setFont('helvetica', 'normal');
    }

    const lines = pdf.splitTextToSize(trimmed, maxWidth);
    
    lines.forEach((line: string) => {
      // Tenta manter na mesma página se estiver muito perto do fim
      if (y > pageHeight - 45) { 
        pdf.addPage();
        y = 25;
      }
      pdf.text(line, margin, y);
      y += lineHeight;
    });
    
    y += 1.5; // Espaço extra reduzido
  });

  y += 8; // Espaço reduzido antes da assinatura

  // 4. Assinatura e Carimbo
  if (data.signature_url || data.stamp_url) {
    if (y > pageHeight - 55) { 
      pdf.addPage();
      y = 25;
    }

    const imgSize = 42; // Reduzi levemente os carimbos para caberem melhor
    const stampY = y;

    if (data.signature_url) {
      try {
        const path = data.signature_url.includes('public/documents/') ? data.signature_url.split('public/documents/')[1] : data.signature_url;
        const url = await fetchAndResolveImage(path);
        if (url) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((res, rej) => { 
            img.onload = res; 
            img.onerror = rej; 
            img.src = url; 
          });
          const h = (img.height * imgSize) / img.width;
          pdf.addImage(img, 'PNG', margin, stampY, imgSize, h);
          // y = Math.max(y, stampY + h); // Atualiza y para não sobrepor rodapé
        }
      } catch (e) {
        console.error("Erro ao carregar assinatura:", e);
      }
    }

    if (data.stamp_url) {
      try {
        const path = data.stamp_url.includes('public/documents/') ? data.stamp_url.split('public/documents/')[1] : data.stamp_url;
        const url = await fetchAndResolveImage(path);
        if (url) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((res, rej) => { 
            img.onload = res; 
            img.onerror = rej; 
            img.src = url; 
          });
          const h = (img.height * imgSize) / img.width;
          pdf.addImage(img, 'PNG', pageWidth - margin - imgSize, stampY, imgSize, h);
          y = Math.max(y, stampY + h + 5);
        }
      } catch (e) {
        console.error("Erro ao carregar carimbo:", e);
      }
    }
  }

  // 5. Rodapé
  pdf.setFontSize(8);
  pdf.setTextColor(150);
  if (data.coligada_endereco) {
    // Garante que o endereço não sobreponha nada
    pdf.text(data.coligada_endereco, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  const fileName = `${data.employee_name.replace(/\s+/g, '_')}.pdf`;
  const blob = pdf.output('blob');

  if (returnBlob) return blob;

  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { 
    document.body.removeChild(a); 
    URL.revokeObjectURL(url);
  }, 3000);
};
