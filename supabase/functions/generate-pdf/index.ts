import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  documentId: z.string().uuid('Invalid document ID'),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate input
    const parseResult = requestSchema.safeParse(await req.json());
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Dados inválidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { documentId } = parseResult.data;

    // Buscar o documento
    const { data: document, error: docError } = await supabase
      .from('generated_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error('Documento não encontrado');
    }

    // Buscar o funcionário para pegar a logo
    const { data: employee } = await supabase
      .from('employees')
      .select('company_logo_url')
      .eq('name', document.employee_name)
      .maybeSingle();

    // Adicionar a logo URL ao documento se existir
    if (employee?.company_logo_url) {
      document.company_logo_url = employee.company_logo_url;
    }

    // Gerar HTML do documento
    const htmlContent = generateHtmlContent(document);

    // Converter HTML para PDF
    const pdfBlob = await generatePdfFromHtml(htmlContent);

    // Upload do PDF - use random UUID for unpredictable filenames
    const filePath = `${crypto.randomUUID()}.pdf`;

    console.log('Uploading to:', filePath);
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
    }

    // Atualizar o documento com o file_path
    const { error: updateError } = await supabase
      .from('generated_documents')
      .update({ file_path: filePath })
      .eq('id', documentId);

    if (updateError) {
      throw new Error(`Erro ao atualizar documento: ${updateError.message}`);
    }

    // Use signed URL instead of public URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (signedUrlError) {
      throw new Error(`Erro ao gerar URL: ${signedUrlError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, filePath, publicUrl: signedUrlData.signedUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-pdf:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function generateHtmlContent(document: any): string {
  const data = document.data || {};
  const processedText = data.processedText || '';
  
  // Se não houver texto processado, faz o fallback para o formato de lista (mas com visual melhor)
  const contentHtml = processedText 
    ? `<div class="letter-body">${processedText.split('\n').map(line => `<div>${line || '&nbsp;'}</div>`).join('')}</div>`
    : `<div class="fields-list">
        ${Object.entries(data).map(([key, value]) => {
          if (['processedText', 'company_logo_url', 'signature_url', 'stamp_url', 'coligada_endereco', 'created_at'].includes(key)) return '';
          return `
            <div class="field">
              <span class="field-label">${formatFieldName(key)}:</span>
              <span class="field-value">${value || '---'}</span>
            </div>
          `;
        }).join('')}
      </div>`;

  const logoUrl = data.company_logo_url || document.company_logo_url;
  const signatureUrl = data.signature_url;
  const stampUrl = data.stamp_url;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
    
    body {
      font-family: 'Inter', 'Helvetica', Arial, sans-serif;
      padding: 0;
      margin: 0;
      color: #1a1a1a;
      background: white;
      line-height: 1.8; /* Aumentado para evitar sobreposição */
    }
    .page {
      padding: 25mm 20mm; /* Aumentei o topo */
      position: relative;
      min-height: 247mm; 
    }
    .header {
      margin-bottom: 40px; /* Mais espaço após o cabeçalho */
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .logo-container {
      width: 160px;
    }
    .company-logo {
      max-width: 100%;
      height: auto;
      object-fit: contain;
    }
    .date-container {
      text-align: right;
      font-size: 11px;
      font-weight: 700;
      color: #333;
      margin-top: -5px;
    }
    .letter-body {
      font-size: 11.5px;
      line-height: 1.8;
      text-align: justify;
      margin-top: 30px;
    }
    .letter-body p, .letter-body div {
      margin-bottom: 12px; /* Força espaço entre parágrafos */
    }
    .fields-list {
      margin-top: 25px;
    }
    .field {
      margin-bottom: 8px;
      font-size: 11px;
    }
    .field-label {
      font-weight: 700;
      color: #444;
    }
    .signatures-section {
      margin-top: 50px;
      display: flex;
      gap: 40px;
      align-items: flex-start;
    }
    .signature-box {
      text-align: center;
      width: 180px;
    }
    .signature-img, .stamp-img {
      max-width: 160px;
      max-height: 80px;
      margin-bottom: 5px;
    }
    .footer {
      position: absolute;
      bottom: 10mm;
      left: 20mm;
      right: 20mm;
      text-align: center;
      font-size: 9px;
      color: #999;
      border-top: 0.5px solid #eee;
      padding-top: 10px;
    }
    /* Estilo para negrito em labels específicas */
    b, strong { font-weight: 700; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo-container">
        ${logoUrl ? `<img src="${logoUrl}" class="company-logo" />` : ''}
      </div>
      <div class="date-container">
        Data de emissão: ${new Date(document.created_at).toLocaleDateString('pt-BR')}
      </div>
    </div>
    
    <div class="content">
      ${contentHtml}
    </div>
    
    ${(signatureUrl || stampUrl) ? `
      <div class="signatures-section">
        ${signatureUrl ? `
          <div class="signature-box">
            <img src="${signatureUrl}" class="signature-img" />
            <div style="font-size: 10px; border-top: 1px solid #ccc; padding-top: 5px;">Assinatura</div>
          </div>
        ` : ''}
        ${stampUrl ? `
          <div class="signature-box">
            <img src="${stampUrl}" class="stamp-img" />
            <div style="font-size: 10px; border-top: 1px solid #ccc; padding-top: 5px;">Carimbo</div>
          </div>
        ` : ''}
      </div>
    ` : ''}
    
    <div class="footer">
      Gerado automaticamente pelo Sistema Tarhget Docs em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
    </div>
  </div>
</body>
</html>
  `.trim();
}

function formatFieldName(key: string): string {
  const fieldNames: Record<string, string> = {
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
  
  return fieldNames[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

async function generatePdfFromHtml(html: string): Promise<Blob> {
  try {
    const response = await fetch('https://api.html2pdf.app/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html: html,
        format: 'A4',
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      })
    });

    if (!response.ok) {
      throw new Error('Erro ao gerar PDF');
    }

    return await response.blob();
  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Blob([html], { type: 'application/pdf' });
  }
}
