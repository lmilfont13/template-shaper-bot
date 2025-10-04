import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const EmployeeImport = () => {
  const [importResult, setImportResult] = useState<any>(null);
  const queryClient = useQueryClient();

  const importEmployees = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('import-employees', {
        body: {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setImportResult(data);
      
      if (data.success) {
        toast({
          title: "Importação concluída!",
          description: `${data.imported} funcionário(s) importado(s) com sucesso.`,
        });
        queryClient.invalidateQueries({ queryKey: ["employees"] });
      } else {
        toast({
          title: "Erro na importação",
          description: data.error || "Ocorreu um erro desconhecido",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao importar funcionários",
        description: error.message,
        variant: "destructive",
      });
      setImportResult({ success: false, error: error.message });
    },
  });

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
            <Download className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle>Importar Funcionários</CardTitle>
            <CardDescription>
              Importar funcionários do seu Supabase externo
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <p className="text-sm font-medium">Como funciona:</p>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Busca todos os funcionários da sua base externa</li>
            <li>Importa para o banco de dados local</li>
            <li>Mantém todos os dados (nome, cargo, departamento, etc.)</li>
            <li>Gera novos IDs para evitar conflitos</li>
          </ol>
        </div>

        {importResult && (
          <Alert variant={importResult.success ? "default" : "destructive"}>
            {importResult.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {importResult.success ? "Sucesso!" : "Erro"}
            </AlertTitle>
            <AlertDescription>
              {importResult.message || importResult.error}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="font-semibold">Erros:</p>
                  <ul className="list-disc list-inside">
                    {importResult.errors.map((err: any, idx: number) => (
                      <li key={idx} className="text-xs">
                        {err.employee}: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={() => importEmployees.mutate()}
          disabled={importEmployees.isPending}
          className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-200 shadow-[var(--shadow-elegant)]"
        >
          {importEmployees.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importando...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Iniciar Importação
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
