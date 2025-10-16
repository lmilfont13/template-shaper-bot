import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessTemplateRequest {
  templateId: string;
  employeeId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_DOCS_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { templateId, employeeId } = await req.json() as ProcessTemplateRequest;

    console.log('Processing template:', templateId, 'for employee:', employeeId);

    // Buscar template
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      throw new Error('Template não encontrado');
    }

    // Buscar funcionário
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      throw new Error('Funcionário não encontrado');
    }

    // Buscar conteúdo do Google Docs
    const googleDocId = template.google_doc_id;
    const googleDocsUrl = `https://docs.googleapis.com/v1/documents/${googleDocId}?key=${googleApiKey}`;

    console.log('Fetching Google Doc:', googleDocId);

    const docResponse = await fetch(googleDocsUrl);
    
    if (!docResponse.ok) {
      const errorText = await docResponse.text();
      console.error('Google Docs API error:', errorText);
      throw new Error(`Erro ao buscar template do Google Docs: ${docResponse.statusText}`);
    }

    const docData = await docResponse.json();

    // Extrair texto do documento
    let documentText = '';
    if (docData.body && docData.body.content) {
      for (const element of docData.body.content) {
        if (element.paragraph) {
          for (const textElement of element.paragraph.elements) {
            if (textElement.textRun && textElement.textRun.content) {
              documentText += textElement.textRun.content;
            }
          }
        }
      }
    }

    console.log('Original document text:', documentText.substring(0, 200));

    // Preparar dados para substituição
    const replacements: Record<string, string> = {
      '{{nome}}': employee.name || '',
      '{{nome_colaborador}}': employee.name || '',
      '{{loja}}': employee.store_name || '',
      '{{nome_loja}}': employee.store_name || '',
      '{{rg}}': employee.rg || '',
      '{{cpf}}': employee.cpf || '',
      '{{data_emissao}}': employee.letter_issue_date ? new Date(employee.letter_issue_date).toLocaleDateString('pt-BR') : '',
      '{{data_carta}}': employee.letter_issue_date ? new Date(employee.letter_issue_date).toLocaleDateString('pt-BR') : '',
      '{{funcao}}': employee.position || '',
      '{{cargo}}': employee.position || '',
      '{{empresa}}': employee.company || '',
      '{{email}}': employee.email || '',
      '{{telefone}}': employee.phone || '',
      '{{departamento}}': employee.department || '',
      '{{data_admissao}}': employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('pt-BR') : '',
      '{{salario}}': employee.salary ? String(employee.salary) : '',
      '{{numero_carteira_trabalho}}': employee.numero_carteira_trabalho || '',
      '{{serie}}': employee.serie || '',
      '{{endereco}}': employee.address || '',
      '{{cidade}}': employee.city || '',
      '{{estado}}': employee.state || '',
      '{{cep}}': employee.zip_code || '',
      '{{contato_emergencia}}': employee.emergency_contact || '',
      '{{telefone_emergencia}}': employee.emergency_phone || '',
    };

    // Substituir placeholders no texto
    let processedText = documentText;
    for (const [placeholder, value] of Object.entries(replacements)) {
      processedText = processedText.replace(new RegExp(placeholder, 'gi'), value);
    }

    console.log('Processed text:', processedText.substring(0, 200));

    // Preparar dados completos
    const templateData: Record<string, any> = {};
    Object.entries(replacements).forEach(([key, value]) => {
      const cleanKey = key.replace(/{{|}}/g, '');
      templateData[cleanKey] = value;
    });

    return new Response(
      JSON.stringify({
        success: true,
        processedText,
        templateData,
        documentTitle: docData.title || template.name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-template:', error);
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
