import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { PDFDocument } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Wand2, Download, Upload, FileText, X } from "lucide-react";

const buildEmployeeData = (employee: any, storeNameOverride?: string): Record<string, string> => {
  const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "");
  return {
    nome: employee.name || "",
    nome_colaborador: employee.name || "",
    loja: storeNameOverride || employee.store_name || "",
    nome_loja: storeNameOverride || employee.store_name || "",
    rg: employee.rg || "",
    cpf: employee.cpf || "",
    data_emissao: fmt(employee.letter_issue_date),
    data_carta: fmt(employee.letter_issue_date),
    funcao: employee.position || "",
    cargo: employee.position || "",
    empresa: employee.company || "",
    email: employee.email || "",
    telefone: employee.phone || "",
    departamento: employee.department || "",
    data_admissao: fmt(employee.hire_date),
    salario: employee.salary ? String(employee.salary) : "",
    numero_carteira_trabalho: employee.numero_carteira_trabalho || "",
    serie: employee.serie || "",
    agencia: employee.agencia || "",
    endereco: employee.address || "",
    cidade: employee.city || "",
    estado: employee.state || "",
    cep: employee.zip_code || "",
    contato_emergencia: employee.emergency_contact || "",
    telefone_emergencia: employee.emergency_phone || "",
    data_atual: new Date().toLocaleDateString("pt-BR"),
  };
};

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "_");

export const QuickTemplate = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>("");
  const [fieldNames, setFieldNames] = useState<string[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [storeName, setStoreName] = useState("");
  const [search, setSearch] = useState("");

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const employee = employees?.find((e) => e.id === selectedEmployeeId);

  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    if (!search.trim()) return employees;
    const s = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.name?.toLowerCase().includes(s) ||
        e.cpf?.toLowerCase().includes(s) ||
        e.position?.toLowerCase().includes(s)
    );
  }, [employees, search]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ title: "Arquivo inválido", description: "Selecione um PDF.", variant: "destructive" });
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const pdfDoc = await PDFDocument.load(bytes);
      const form = pdfDoc.getForm();
      const fields = form.getFields().map((f) => f.getName());
      setPdfBytes(bytes);
      setPdfFileName(file.name);
      setFieldNames(fields);
      if (fields.length === 0) {
        toast({
          title: "Nenhum campo encontrado",
          description: "Este PDF não possui campos de formulário (AcroForm).",
          variant: "destructive",
        });
      } else {
        toast({ title: "PDF carregado", description: `${fields.length} campo(s) detectado(s).` });
      }
    } catch (err: any) {
      toast({ title: "Erro ao ler PDF", description: err.message, variant: "destructive" });
    }
  };

  const handleClearPdf = () => {
    setPdfBytes(null);
    setPdfFileName("");
    setFieldNames([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    if (!pdfBytes || !employee) {
      toast({ title: "Faltam dados", description: "Envie o PDF e selecione um promotor.", variant: "destructive" });
      return;
    }
    try {
      const data = buildEmployeeData(employee, storeName);
      const dataNormalized: Record<string, string> = {};
      Object.entries(data).forEach(([k, v]) => { dataNormalized[normalize(k)] = v; });

      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      let filledCount = 0;
      const unfilled: string[] = [];

      for (const field of fields) {
        const name = field.getName();
        const key = normalize(name);
        const value = dataNormalized[key];
        if (value === undefined) {
          unfilled.push(name);
          continue;
        }
        const type = field.constructor.name;
        try {
          if (type === "PDFTextField") {
            (field as any).setText(value);
            filledCount++;
          } else if (type === "PDFCheckBox") {
            if (value && value !== "0" && value.toLowerCase() !== "false") (field as any).check();
            filledCount++;
          } else if (type === "PDFDropdown" || type === "PDFOptionList") {
            (field as any).select(value);
            filledCount++;
          } else {
            (field as any).setText?.(value);
            filledCount++;
          }
        } catch (e) {
          console.warn(`Erro ao preencher campo ${name}:`, e);
        }
      }

      // Flatten so values appear as static text and PDF stays read-only
      form.flatten();

      const filled = await pdfDoc.save();
      const blob = new Blob([filled as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (employee.name || "documento").replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "documento";
      a.download = `${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      toast({
        title: "PDF gerado!",
        description: `${filledCount} campo(s) preenchido(s).${unfilled.length ? ` ${unfilled.length} sem dados.` : ""}`,
      });
    } catch (err: any) {
      toast({ title: "Erro ao gerar PDF", description: err.message, variant: "destructive" });
    }
  };

  const knownKeys = useMemo(() => {
    if (!employee) return new Set<string>();
    return new Set(Object.keys(buildEmployeeData(employee, storeName)).map(normalize));
  }, [employee, storeName]);

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
            <Wand2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle>Template Rápido (PDF)</CardTitle>
            <CardDescription>
              Envie um PDF com campos de formulário (AcroForm) e selecione um promotor para preencher automaticamente.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Template PDF</Label>
          {!pdfBytes ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Clique para enviar o PDF</p>
              <p className="text-xs text-muted-foreground">
                O PDF deve conter campos de formulário nomeados (ex: nome, cpf, cargo)
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{pdfFileName}</p>
                  <p className="text-xs text-muted-foreground">{fieldNames.length} campo(s) detectado(s)</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClearPdf}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {fieldNames.length > 0 && (
          <div className="space-y-2">
            <Label>Campos do PDF</Label>
            <div className="flex flex-wrap gap-2">
              {fieldNames.map((name) => {
                const matched = knownKeys.has(normalize(name));
                return (
                  <Badge
                    key={name}
                    variant={matched ? "default" : "outline"}
                    className={matched ? "" : "text-muted-foreground"}
                  >
                    {name} {matched ? "✓" : "—"}
                  </Badge>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Campos com ✓ serão preenchidos automaticamente. Campos sem dados ficarão em branco.
            </p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label>Buscar promotor</Label>
            <Input
              placeholder="Nome, CPF ou cargo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um promotor" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50 max-h-72">
                {filteredEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} {emp.cpf ? `— ${emp.cpf}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sobrescrever loja (opcional)</Label>
            <Input
              placeholder="Nome da loja"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Se preenchido, substitui a loja do promotor nos campos {`{{loja}}`} / {`{{nome_loja}}`}.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleGenerate}
            disabled={!pdfBytes || !employee || fieldNames.length === 0}
            size="lg"
          >
            <Download className="h-4 w-4 mr-2" /> Gerar PDF Preenchido
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
