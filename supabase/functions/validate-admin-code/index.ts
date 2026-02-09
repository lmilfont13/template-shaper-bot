import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  accessCode: z.string().min(1).max(100),
});

function timingSafeCompare(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  
  if (aBytes.length !== bBytes.length) {
    // Compare against itself to maintain constant time
    let result = 1;
    for (let i = 0; i < aBytes.length; i++) {
      result |= aBytes[i] ^ aBytes[i];
    }
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  return result === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate JWT - require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input
    const parseResult = requestSchema.safeParse(await req.json());
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados inválidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, accessCode } = parseResult.data;

    // Ensure user can only elevate their own account
    if (userId !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Operação não permitida' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: check attempts in last hour
    const { data: attempts } = await supabaseClient
      .from('admin_code_attempts')
      .select('id')
      .eq('user_id', userId)
      .gte('attempted_at', new Date(Date.now() - 3600000).toISOString());

    if (attempts && attempts.length >= 5) {
      return new Response(
        JSON.stringify({ success: false, error: 'Muitas tentativas. Tente novamente em 1 hora.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminCode = Deno.env.get('ADMIN_ACCESS_CODE');

    if (!adminCode) {
      console.error('ADMIN_ACCESS_CODE não configurado');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração do servidor incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Constant-time comparison
    const isValid = timingSafeCompare(accessCode, adminCode);

    // Log attempt
    await supabaseClient.from('admin_code_attempts').insert({
      user_id: userId,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      success: isValid,
    });

    if (!isValid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Código de acesso inválido' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Valid code - update role to admin
    const { error: updateError } = await supabaseClient
      .from('user_roles')
      .update({ role: 'admin' })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Erro ao atualizar role:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao atualizar permissões' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Acesso admin concedido com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na validação do código admin:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
