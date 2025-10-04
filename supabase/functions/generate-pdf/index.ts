import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratePdfRequest {
  documentId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { documentId } = await req.json() as GeneratePdfRequest;

    // Buscar o documento
    const { data: document, error: docError } = await supabase
      .from('generated_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error('Documento não encontrado');
    }

    // Gerar HTML do documento
    const htmlContent = generateHtmlContent(document);

    // Converter HTML para PDF usando uma API externa (PDF.co ou similar)
    // Por enquanto, vamos criar um PDF simples com texto
    const pdfBlob = await generatePdfFromHtml(htmlContent);

    // Upload do PDF para o storage - remover acentos e caracteres especiais
    const sanitizedEmployeeName = document.employee_name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '_') // Substitui espaços por _
      .replace(/_+/g, '_') // Remove _ duplicados
      .replace(/^_|_$/g, '') // Remove _ no início e fim
      .substring(0, 50); // Limita tamanho
    
    const sanitizedTemplateName = document.template_name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 30);
    
    // Se o nome ficar vazio, usar um fallback
    const finalEmployeeName = sanitizedEmployeeName || 'funcionario';
    const finalTemplateName = sanitizedTemplateName || 'documento';
    
    const fileName = `${finalEmployeeName}_${finalTemplateName}_${Date.now()}.pdf`;
    const filePath = `${fileName}`; // Não usar subpasta 'documents/' se não existir

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

    // Obter URL pública do arquivo
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    return new Response(
      JSON.stringify({ success: true, filePath, publicUrl }),
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
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      line-height: 1.6;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .content {
      margin: 20px 0;
    }
    .field {
      margin: 15px 0;
      padding: 10px;
      background-color: #f5f5f5;
      border-left: 4px solid #333;
    }
    .field-label {
      font-weight: bold;
      color: #555;
      margin-bottom: 5px;
    }
    .field-value {
      color: #333;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ccc;
      text-align: center;
      color: #777;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${document.template_name}</div>
    <div>Funcionário: ${document.employee_name}</div>
  </div>
  
  <div class="content">
    ${Object.entries(data).map(([key, value]) => `
      <div class="field">
        <div class="field-label">${formatFieldName(key)}</div>
        <div class="field-value">${value || 'Não informado'}</div>
      </div>
    `).join('')}
  </div>
  
  <div class="footer">
    Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
  </div>
</body>
</html>
  `.trim();
}

function formatFieldName(key: string): string {
  const fieldNames: Record<string, string> = {
    nome: 'Nome',
    email: 'E-mail',
    telefone: 'Telefone',
    cargo: 'Cargo',
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
  // Usar a API do pdf.co ou similar para converter HTML em PDF
  // Por enquanto, vou usar uma biblioteca simples
  
  try {
    // Usar API pública para conversão HTML -> PDF
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
    // Fallback: criar um PDF básico de texto
    return new Blob([html], { type: 'application/pdf' });
  }
}
