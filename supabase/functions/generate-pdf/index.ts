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
  let processedText = data.processedText || '';
  
  // Limpeza profunda de HTML para evitar conflitos de estilo
  processedText = processedText.replace(/<br\s*\/?>/gi, '\n');
  processedText = processedText.replace(/<p>/gi, '');
  processedText = processedText.replace(/<\/p>/gi, '\n');
  processedText = processedText.replace(/<[^>]*>?/gm, '');

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
      font-family: 'Inter', Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #000;
      background: white;
      font-size: 10.5pt;
      line-height: 1.4;
    }
    .page {
      width: 210mm;
      height: 297mm;
      padding: 15mm 20mm;
      box-sizing: border-box;
      position: relative;
    }
    table { width: 100%; border-collapse: collapse; }
    .header-table td { vertical-align: top; }
    .logo { max-width: 140px; max-height: 80px; }
    .date { text-align: right; font-weight: bold; font-size: 9pt; }
    
    .content {
      margin-top: 25px;
      text-align: justify;
      white-space: pre-wrap; /* Crucial para respeitar as quebras de linha */
    }
    
    .signatures-table {
      margin-top: 40px;
    }
    .signature-cell {
      width: 50%;
      text-align: center;
      padding: 10px;
    }
    .sig-img { max-width: 150px; max-height: 70px; display: block; margin: 0 auto 5px auto; }
    .sig-line { border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 5px; font-size: 8pt; }
    
    .footer {
      position: absolute;
      bottom: 15mm;
      left: 20mm;
      right: 20mm;
      text-align: center;
      font-size: 8pt;
      color: #888;
      border-top: 0.5px solid #eee;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <div class="page">
    <table class="header-table">
      <tr>
        <td>
          ${logoUrl ? `<img src="${logoUrl}" class="logo" />` : ''}
        </td>
        <td class="date">
          Data de emissão: ${new Date(document.created_at).toLocaleDateString('pt-BR')}
        </td>
      </tr>
    </table>
    
    <div class="content">${processedText.trim()}</div>
    
    <table class="signatures-table">
      <tr>
        ${signatureUrl ? `
          <td class="signature-cell">
            <img src="${signatureUrl}" class="sig-img" />
            <div class="sig-line">Assinatura</div>
          </td>
        ` : ''}
        ${stampUrl ? `
          <td class="signature-cell">
            <img src="${stampUrl}" class="sig-img" />
            <div class="sig-line">Carimbo</div>
          </td>
        ` : ''}
      </tr>
    </table>
    
    <div class="footer">
      Gerado via Sistema Tarhget Docs em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
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
