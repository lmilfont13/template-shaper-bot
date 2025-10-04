import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get credentials from environment
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_ANON_KEY');
    const localUrl = Deno.env.get('SUPABASE_URL');
    const localServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!externalUrl || !externalKey) {
      throw new Error('External Supabase credentials not configured');
    }

    console.log('Starting employee import...');

    // Create clients
    const externalSupabase = createClient(externalUrl, externalKey);
    const localSupabase = createClient(localUrl!, localServiceKey!);

    // Fetch employees from external Supabase
    console.log('Fetching employees from external database...');
    const { data: externalEmployees, error: fetchError } = await externalSupabase
      .from('employees')
      .select('*');

    if (fetchError) {
      console.error('Error fetching employees:', fetchError);
      throw new Error(`Failed to fetch employees: ${fetchError.message}`);
    }

    if (!externalEmployees || externalEmployees.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No employees found to import',
          imported: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${externalEmployees.length} employees to import`);

    // Import employees to local database
    const importedEmployees = [];
    const errors = [];

    for (const employee of externalEmployees) {
      // Remove the id to let the database generate a new one
      const { id, created_at, updated_at, ...employeeData } = employee;

      const { data: imported, error: importError } = await localSupabase
        .from('employees')
        .insert(employeeData)
        .select()
        .single();

      if (importError) {
        console.error('Error importing employee:', employee.name, importError);
        errors.push({ employee: employee.name, error: importError.message });
      } else {
        importedEmployees.push(imported);
        console.log('Imported employee:', employee.name);
      }
    }

    const result = {
      success: true,
      message: `Import completed: ${importedEmployees.length} employees imported`,
      imported: importedEmployees.length,
      total: externalEmployees.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('Import result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in import-employees function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
