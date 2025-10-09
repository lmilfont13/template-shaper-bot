import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle, Upload, ArrowRight, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Papa from "papaparse";

const FIELD_MAPPING = {
  name: "Nome",
  store_name: "Loja",
  rg: "RG",
  cpf: "CPF",
  letter_issue_date: "Data de Emissão",
  position: "Cargo/Função",
  company: "Empresa",
  email: "Email",
  phone: "Telefone",
  department: "Departamento",
  hire_date: "Data de Admissão",
  salary: "Salário",
  address: "Endereço",
  city: "Cidade",
  state: "Estado",
  zip_code: "CEP",
  emergency_contact: "Contato de Emergência",
  emergency_phone: "Telefone de Emergência",
};

export const EmployeeImport = () => {
  const [importResult, setImportResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<1 | 2>(1);
  const [clearDatabase, setClearDatabase] = useState<"add" | "replace">("add");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const importFromCsv = useMutation({
    mutationFn: async () => {
      if (!csvData.length || !Object.keys(columnMapping).length) {
        throw new Error("Dados ou mapeamento de colunas inválido");
      }

      // Se a opção for substituir, apagar todos os registros primeiro
      if (clearDatabase === "replace") {
        const { error: deleteError } = await supabase
          .from("employees")
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        
        if (deleteError) throw deleteError;
      }

      const employees = csvData
        .map((row: any) => {
          const employee: any = {};
          Object.entries(columnMapping).forEach(([dbField, csvColumn]) => {
            if (csvColumn && csvColumn !== "ignore") {
              employee[dbField] = row[csvColumn] || null;
            }
          });
          return employee;
        })
        .filter((emp: any) => emp.name && emp.name.trim() !== "");

      if (employees.length === 0) {
        throw new Error("Nenhum funcionário válido encontrado após o mapeamento");
      }

      const { data, error } = await supabase
        .from("employees")
        .insert(employees)
        .select();

      if (error) throw error;

      const action = clearDatabase === "replace" ? "substituído(s)" : "importado(s)";
      return { success: true, imported: data.length, message: `${data.length} funcionário(s) ${action} com sucesso` };
    },
    onSuccess: (data: any) => {
      setImportResult(data);
      toast({
        title: "Importação concluída!",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      resetImport();
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

  const resetImport = () => {
    setSelectedFile(null);
    setCsvData([]);
    setCsvColumns([]);
    setSelectedColumns([]);
    setColumnMapping({});
    setStep(1);
    setClearDatabase("add");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
      
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        preview: 5,
        complete: (results) => {
          const columns = results.meta.fields || [];
          setCsvColumns(columns);
          setCsvData(results.data);
          setSelectedColumns(columns);
          setSelectedFile(file);
          
          // Auto-mapping baseado em nomes comuns
          const autoMapping: Record<string, string> = {};
          columns.forEach((col) => {
            const colLower = col.toLowerCase();
            if (colLower.includes('nome') || colLower === 'name') autoMapping.name = col;
            if (colLower.includes('loja') || colLower.includes('store')) autoMapping.store_name = col;
            if (colLower === 'rg') autoMapping.rg = col;
            if (colLower === 'cpf') autoMapping.cpf = col;
            if (colLower.includes('cargo') || colLower.includes('funcao') || colLower === 'position') autoMapping.position = col;
            if (colLower.includes('empresa') || colLower === 'company') autoMapping.company = col;
            if (colLower === 'email') autoMapping.email = col;
            if (colLower.includes('telefone') || colLower === 'phone') autoMapping.phone = col;
            if (colLower.includes('departamento') || colLower === 'department') autoMapping.department = col;
          });
          setColumnMapping(autoMapping);
        },
        error: (error) => {
          toast({
            title: "Erro ao ler CSV",
            description: error.message,
            variant: "destructive",
          });
        }
      });
    }
  };

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const handleNextStep = () => {
    if (!selectedFile) {
      toast({
        title: "Arquivo não selecionado",
        description: "Por favor, selecione um arquivo CSV",
        variant: "destructive",
      });
      return;
    }

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const filteredData = results.data.map((row: any) => {
          const filtered: any = {};
          selectedColumns.forEach(col => {
            filtered[col] = row[col];
          });
          return filtered;
        });
        setCsvData(filteredData);
        setStep(2);
      }
    });
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Upload className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle>Importar Funcionários via CSV</CardTitle>
              <CardDescription>
                {step === 1 ? "Passo 1: Selecione o arquivo e escolha as colunas" : "Passo 2: Mapeie as colunas para os campos"}
              </CardDescription>
            </div>
          </div>
          {selectedFile && (
            <Button variant="outline" size="sm" onClick={resetImport}>
              Cancelar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 1 ? (
          <>
            <div className="space-y-4">
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
              </div>

              {selectedFile && csvColumns.length > 0 && (
                <>
                  <div className="space-y-3">
                    <Label>Selecione as colunas que deseja importar:</Label>
                    <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto p-4 rounded-lg border bg-muted/30">
                      {csvColumns.map((column) => (
                        <div key={column} className="flex items-center gap-2">
                          <Checkbox
                            id={column}
                            checked={selectedColumns.includes(column)}
                            onCheckedChange={() => handleColumnToggle(column)}
                          />
                          <label
                            htmlFor={column}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {column}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedColumns.length} de {csvColumns.length} colunas selecionadas
                    </p>
                  </div>

                  {csvData.length > 0 && (
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm font-medium mb-2">Preview (primeiras 5 linhas):</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b">
                              {selectedColumns.map((col) => (
                                <th key={col} className="text-left p-2 font-medium">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {csvData.slice(0, 5).map((row: any, idx) => (
                              <tr key={idx} className="border-b">
                                {selectedColumns.map((col) => (
                                  <td key={col} className="p-2">{row[col]}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleNextStep}
                    disabled={selectedColumns.length === 0}
                    className="w-full bg-gradient-to-r from-primary to-accent"
                  >
                    Próximo: Mapear Colunas
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-3">Mapeie cada coluna da planilha para um campo do sistema:</p>
                <div className="space-y-3">
                  {selectedColumns.filter(col => col && col.trim() !== "").map((csvColumn) => (
                    <div key={csvColumn} className="grid grid-cols-2 gap-3 items-center">
                      <Label className="text-sm font-medium">{csvColumn}:</Label>
                      <Select
                        value={Object.entries(columnMapping).find(([_, val]) => val === csvColumn)?.[0] || "ignore"}
                        onValueChange={(dbField) => {
                          setColumnMapping(prev => {
                            // Remove o mapeamento anterior desta coluna CSV
                            const newMapping = Object.fromEntries(
                              Object.entries(prev).filter(([_, val]) => val !== csvColumn)
                            );
                            // Adiciona o novo mapeamento se não for "ignore"
                            if (dbField !== "ignore") {
                              newMapping[dbField] = csvColumn;
                            }
                            return newMapping;
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Ignorar campo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ignore">Ignorar campo</SelectItem>
                          {Object.entries(FIELD_MAPPING).map(([dbField, label]) => (
                            <SelectItem key={dbField} value={dbField}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
                <Label className="text-sm font-medium mb-3 block">O que fazer com os dados existentes?</Label>
                <RadioGroup value={clearDatabase} onValueChange={(value: "add" | "replace") => setClearDatabase(value)}>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="add" id="add" />
                    <Label htmlFor="add" className="font-normal cursor-pointer">
                      Adicionar ao banco existente (manter dados atuais)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="replace" id="replace" />
                    <Label htmlFor="replace" className="font-normal cursor-pointer text-destructive">
                      Substituir todos os dados (apagar banco e importar novos)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button
                  onClick={() => importFromCsv.mutate()}
                  disabled={!columnMapping.name || importFromCsv.isPending}
                  className="flex-1 bg-gradient-to-r from-primary to-accent"
                >
                  {importFromCsv.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Importar Funcionários
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

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
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
