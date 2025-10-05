import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, accessCode } = await req.json();

    console.log('Validating admin code for user:', userId);

    if (!userId || !accessCode) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'userId e accessCode são obrigatórios' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Buscar código admin das secrets
    const adminCode = Deno.env.get('ADMIN_ACCESS_CODE');

    if (!adminCode) {
      console.error('ADMIN_ACCESS_CODE não configurado');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Configuração do servidor incompleta' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validar código de acesso
    if (accessCode !== adminCode) {
      console.log('Código de acesso inválido');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Código de acesso inválido' 
        }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Código válido - atualizar role para admin
    console.log('Código válido - atualizando role para admin');

    const { error: updateError } = await supabaseClient
      .from('user_roles')
      .update({ role: 'admin' })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Erro ao atualizar role:', updateError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao atualizar permissões' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Role atualizado com sucesso para admin');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Acesso admin concedido com sucesso' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro na validação do código admin:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
