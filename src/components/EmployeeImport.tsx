import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Download, Loader2, CheckCircle2, AlertCircle, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Papa from "papaparse";

export const EmployeeImport = () => {
  const [importResult, setImportResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const importFromCsv = useMutation({
    mutationFn: async (file: File) => {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            try {
              const employees = results.data
                .map((row: any) => ({
                  name: row.nome || row.name || row.Nome || row.nome_colaborador || "",
                  store_name: row.loja || row.store_name || row.nome_loja || "",
                  rg: row.rg || row.RG || "",
                  cpf: row.cpf || row.CPF || "",
                  letter_issue_date: row.data_emissao || row.letter_issue_date || row.data_carta || null,
                  position: row.funcao || row.cargo || row.position || row.Cargo || "",
                  company: row.empresa || row.company || row.Empresa || "",
                  email: row.email || row.Email || "",
                  phone: row.telefone || row.phone || row.Telefone || "",
                  department: row.departamento || row.department || row.Departamento || "",
                  hire_date: row.data_admissao || row.hire_date || row.Data_Admissao || null,
                  salary: row.salario || row.salary || row.Salario || null,
                  address: row.endereco || row.address || row.Endereco || "",
                  city: row.cidade || row.city || row.Cidade || "",
                  state: row.estado || row.state || row.Estado || "",
                  zip_code: row.cep || row.zip_code || row.CEP || "",
                  emergency_contact: row.contato_emergencia || row.emergency_contact || row.Contato_Emergencia || "",
                  emergency_phone: row.telefone_emergencia || row.emergency_phone || row.Telefone_Emergencia || "",
                }))
                .filter((emp: any) => emp.name.trim() !== ""); // Filtrar funcionários sem nome

              if (employees.length === 0) {
                throw new Error("Nenhum funcionário válido encontrado. Certifique-se de que o CSV contém uma coluna 'nome' ou 'name' com valores.");
              }

              const { data, error } = await supabase
                .from("employees")
                .insert(employees)
                .select();

              if (error) throw error;

              resolve({ success: true, imported: data.length, message: `${data.length} funcionário(s) importado(s) com sucesso` });
            } catch (error: any) {
              reject(error);
            }
          },
          error: (error) => {
            reject(new Error(`Erro ao processar CSV: ${error.message}`));
          }
        });
      });
    },
    onSuccess: (data: any) => {
      setImportResult(data);
      toast({
        title: "Importação concluída!",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao importar CSV",
        description: error.message,
        variant: "destructive",
      });
      setImportResult({ success: false, error: error.message });
    },
  });

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
        toast({
          title: "Formato inválido",
          description: "Por favor, selecione um arquivo CSV",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleCsvImport = () => {
    if (!selectedFile) {
      toast({
        title: "Arquivo não selecionado",
        description: "Por favor, selecione um arquivo CSV",
        variant: "destructive",
      });
      return;
    }
    importFromCsv.mutate(selectedFile);
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
            <Upload className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle>Importar Funcionários</CardTitle>
            <CardDescription>
              Importe funcionários de uma planilha CSV ou do Supabase externo
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* CSV Import Section */}
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <p className="text-sm font-medium">Importar de CSV:</p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>O arquivo CSV deve conter as seguintes colunas (opcionais):</p>
              <p className="text-xs font-mono bg-background p-2 rounded">
                nome (ou nome_colaborador), loja (ou nome_loja), rg, cpf, data_emissao (ou data_carta), funcao (ou cargo), empresa, email, telefone, departamento
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-file">Selecione o arquivo CSV</Label>
            <Input
              ref={fileInputRef}
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: {selectedFile.name}
              </p>
            )}
          </div>

          <Button
            onClick={handleCsvImport}
            disabled={!selectedFile || importFromCsv.isPending}
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-200 shadow-[var(--shadow-elegant)]"
          >
            {importFromCsv.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando CSV...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importar CSV
              </>
            )}
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Ou</span>
          </div>
        </div>

        {/* External Supabase Import Section */}
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <p className="text-sm font-medium">Importar do Supabase Externo:</p>
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
            className="w-full bg-gradient-to-r from-accent to-primary hover:opacity-90 transition-all duration-200"
          >
            {importEmployees.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando do Supabase...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Importar do Supabase Externo
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
