import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Wand2, Download, Copy } from "lucide-react";
import { generatePDFFromTemplate } from "@/utils/pdfFromTemplate";
import { getStorageUrl } from "@/utils/supabaseStorage";

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
  };
};

export const QuickTemplate = () => {
  const [templateContent, setTemplateContent] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedColigadaId, setSelectedColigadaId] = useState("");
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

  const { data: coligadas } = useQuery({
    queryKey: ["coligadas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coligadas").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const employee = employees?.find((e) => e.id === selectedEmployeeId);
  const coligada = coligadas?.find((c) => c.id === selectedColigadaId);

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

  const processedText = useMemo(() => {
    if (!templateContent) return "";
    if (!employee) return templateContent;
    const data = buildEmployeeData(employee, storeName);
    let out = templateContent;
    Object.entries(data).forEach(([key, value]) => {
      out = out.replace(new RegExp(`{{\\s*${key}\\s*}}`, "gi"), value);
    });
    return out;
  }, [templateContent, employee, storeName]);

  const handleCopy = async () => {
    if (!processedText) return;
    await navigator.clipboard.writeText(processedText);
    toast({ title: "Copiado!", description: "Texto preenchido copiado para a área de transferência." });
  };

  const handleDownloadPDF = async () => {
    if (!processedText || !employee) {
      toast({ title: "Selecione um promotor e cole o template", variant: "destructive" });
      return;
    }
    try {
      await generatePDFFromTemplate({
        employee_name: employee.name,
        template_name: "Template Rápido",
        processedText,
        company_logo_url: coligada ? getStorageUrl(coligada.company_logo_url) : undefined,
        signature_url: coligada ? getStorageUrl(coligada.signature_url) : undefined,
        stamp_url: coligada ? getStorageUrl(coligada.stamp_url) : undefined,
        coligada_endereco: coligada?.endereco || undefined,
        created_at: new Date().toISOString(),
      });
      toast({ title: "PDF gerado!", description: "Download iniciado." });
    } catch (err: any) {
      toast({ title: "Erro ao gerar PDF", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
            <Wand2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle>Template Rápido</CardTitle>
            <CardDescription>
              Cole um template e selecione um promotor para preencher os dados automaticamente
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
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
            <Label>Coligada (opcional, p/ logo/assinatura no PDF)</Label>
            <Select value={selectedColigadaId} onValueChange={setSelectedColigadaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma coligada" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {coligadas?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label className="pt-2">Sobrescrever loja (opcional)</Label>
            <Input
              placeholder="Nome da loja"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Template</Label>
          <Textarea
            placeholder={`Cole aqui o conteúdo do template. Use placeholders como {{nome}}, {{cpf}}, {{cargo}}, {{loja}}, {{data_emissao}}, etc.`}
            value={templateContent}
            onChange={(e) => setTemplateContent(e.target.value)}
            rows={10}
            className="font-mono text-sm"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Resultado preenchido</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} disabled={!processedText}>
                <Copy className="h-4 w-4 mr-2" /> Copiar
              </Button>
              <Button size="sm" onClick={handleDownloadPDF} disabled={!processedText || !employee}>
                <Download className="h-4 w-4 mr-2" /> Baixar PDF
              </Button>
            </div>
          </div>
          <div className="min-h-[180px] whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm">
            {processedText || (
              <span className="text-muted-foreground">
                A pré-visualização aparecerá aqui depois que você colar o template e selecionar um promotor.
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};