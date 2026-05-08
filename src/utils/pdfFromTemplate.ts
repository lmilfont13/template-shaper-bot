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
        const imgW = 35; // Um pouco menor para ficar mais elegante
        const imgH = (img.height * imgW) / img.width;
        pdf.addImage(img, 'PNG', margin, y, imgW, imgH);
        y += imgH + 15; // Aumentei o espaço após o logo (era 8)
      }
    } catch (e) { 
      y += 10; // Espaço padrão se falhar o logo
    }
  } else {
    y += 10; // Espaço inicial se não tiver logo
  }

  // 2. Data
  pdf.setFontSize(9);
  pdf.setTextColor(120);
  const dateStr = new Date(data.created_at).toLocaleDateString('pt-BR');
  pdf.text(`Emitido em: ${dateStr}`, pageWidth - margin, 20, { align: 'right' }); // Desci a data para 20 (era 12)
  pdf.setTextColor(0);

  // 3. Conteúdo (Processamento por parágrafos para evitar sobreposição)
  const cleanText = stripHtmlAndPlaceholders(data.processedText);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  
  const lineHeight = 7.0; // Espaçamento mais generoso
  const maxWidth = pageWidth - (margin * 2);
  
  // Dividir primeiro por parágrafos reais (\n)
  const paragraphs = cleanText.split('\n');
  
  paragraphs.forEach((paragraph) => {
    if (paragraph.trim() === '') {
      y += lineHeight * 0.5; // Espaço para parágrafo vazio
      return;
    }
    
    // Dividir cada parágrafo em linhas que caibam na largura
    const lines = pdf.splitTextToSize(paragraph, maxWidth);
    
    lines.forEach((line: string) => {
      if (y > pageHeight - 50) { // Margem de segurança para carimbos
        pdf.addPage();
        y = 25;
      }
      pdf.text(line, margin, y);
      y += lineHeight;
    });
    
    y += 2; // Espaço extra entre parágrafos
  });

  y += 10; // Espaço antes da assinatura

  // 4. Assinatura e Carimbo (Garantindo exibição)
  if (data.signature_url || data.stamp_url) {
    // Verificar se cabe na página atual, senão pula
    if (y > pageHeight - 50) {
      pdf.addPage();
      y = 25;
    }

    const imgSize = 45;
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
