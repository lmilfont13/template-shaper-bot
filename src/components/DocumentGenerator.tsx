import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { FileText, Loader2, Eye } from "lucide-react";
import { generatePDFFromTemplate } from "@/utils/pdfFromTemplate";

export const DocumentGenerator = () => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ["document-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const generateDocument = useMutation({
    mutationFn: async () => {
      const template = templates?.find((t) => t.id === selectedTemplate);
      if (!template) throw new Error("Template não encontrado");

      const employee = employees?.find((e) => e.id === selectedEmployeeId);
      
      if (!employee) {
        throw new Error("Funcionário não encontrado. Selecione um funcionário da lista.");
      }

      // Preparar dados para substituição
      const templateData: Record<string, any> = {
        nome: employee.name,
        nome_colaborador: employee.name,
        loja: employee.store_name || "",
        nome_loja: employee.store_name || "",
        rg: employee.rg || "",
        cpf: employee.cpf || "",
        data_emissao: employee.letter_issue_date ? new Date(employee.letter_issue_date).toLocaleDateString('pt-BR') : "",
        data_carta: employee.letter_issue_date ? new Date(employee.letter_issue_date).toLocaleDateString('pt-BR') : "",
        funcao: employee.position || "",
        cargo: employee.position || "",
        empresa: employee.company || "",
        email: employee.email || "",
        telefone: employee.phone || "",
        departamento: employee.department || "",
        data_admissao: employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('pt-BR') : "",
        salario: employee.salary ? String(employee.salary) : "",
        endereco: employee.address || "",
        cidade: employee.city || "",
        estado: employee.state || "",
        cep: employee.zip_code || "",
        contato_emergencia: employee.emergency_contact || "",
        telefone_emergencia: employee.emergency_phone || "",
      };

      // Processar template se houver conteúdo
      let processedText = template.template_content || "";
      if (processedText) {
        Object.entries(templateData).forEach(([key, value]) => {
          const placeholder = `{{${key}}}`;
          processedText = processedText.replace(new RegExp(placeholder, 'gi'), value);
        });
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase
        .from("generated_documents")
        .insert({
          employee_name: employee.name,
          template_id: selectedTemplate,
          template_name: template.name,
          status: "completed",
          data: { 
            ...templateData, 
            processedText,
            company_logo_url: employee.company_logo_url || undefined,
            signature_url: employee.signature_url || undefined,
            stamp_url: employee.stamp_url || undefined,
            created_at: new Date().toISOString(),
          },
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Documento gerado!",
        description: "O documento foi criado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["generated-documents"] });
      setSelectedEmployeeId("");
      setSelectedTemplate("");
    },
    onError: (error) => {
      toast({
        title: "Erro ao gerar documento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!selectedEmployeeId) {
      toast({
        title: "Funcionário obrigatório",
        description: "Por favor, selecione um funcionário.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTemplate) {
      toast({
        title: "Template obrigatório",
        description: "Por favor, selecione um tipo de documento.",
        variant: "destructive",
      });
      return;
    }

    generateDocument.mutate();
  };

  const handlePreview = () => {
    if (!selectedEmployeeId) {
      toast({
        title: "Funcionário obrigatório",
        description: "Por favor, selecione um funcionário.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTemplate) {
      toast({
        title: "Template obrigatório",
        description: "Por favor, selecione um tipo de documento.",
        variant: "destructive",
      });
      return;
    }

    const template = templates?.find((t) => t.id === selectedTemplate);
    const employee = employees?.find((e) => e.id === selectedEmployeeId);
    
    if (!template || !employee) return;

    // Preparar dados
    const templateData: Record<string, any> = {
      nome: employee.name,
      nome_colaborador: employee.name,
      loja: employee.store_name || "",
      nome_loja: employee.store_name || "",
      rg: employee.rg || "",
      cpf: employee.cpf || "",
      data_emissao: employee.letter_issue_date ? new Date(employee.letter_issue_date).toLocaleDateString('pt-BR') : "",
      data_carta: employee.letter_issue_date ? new Date(employee.letter_issue_date).toLocaleDateString('pt-BR') : "",
      funcao: employee.position || "",
      cargo: employee.position || "",
      empresa: employee.company || "",
      email: employee.email || "",
      telefone: employee.phone || "",
      departamento: employee.department || "",
      endereco: employee.address || "",
      cidade: employee.city || "",
      estado: employee.state || "",
      cep: employee.zip_code || "",
      contato_emergencia: employee.emergency_contact || "",
      telefone_emergencia: employee.emergency_phone || "",
    };

    // Processar template
    let processedText = template.template_content || "";
    let previewText = processedText;
    
    if (processedText) {
      Object.entries(templateData).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        processedText = processedText.replace(new RegExp(placeholder, 'gi'), value);
      });
      previewText = processedText;
    }

    // Substituir placeholders de imagens para preview
    if (employee.signature_url && previewText.includes('{{assinatura}}')) {
      previewText = previewText.replace(/{{assinatura}}/gi, '[ASSINATURA SERÁ INSERIDA AQUI]');
    }
    if (employee.stamp_url && previewText.includes('{{carimbo}}')) {
      previewText = previewText.replace(/{{carimbo}}/gi, '[CARIMBO SERÁ INSERIDO AQUI]');
    }

    setPreviewData({
      employee_name: employee.name,
      template_name: template.name,
      processedText: previewText,
      originalProcessedText: processedText,
      company_logo_url: employee.company_logo_url,
      signature_url: employee.signature_url,
      stamp_url: employee.stamp_url,
      created_at: new Date().toISOString(),
    });
    setPreviewOpen(true);
  };

  const handleDownloadPreview = async () => {
    if (!previewData) return;
    
    try {
      await generatePDFFromTemplate({
        ...previewData,
        processedText: previewData.originalProcessedText,
      });
      toast({
        title: "PDF baixado!",
        description: "O documento foi baixado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao baixar PDF",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleGenerateFromPreview = () => {
    setPreviewOpen(false);
    generateDocument.mutate();
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
            <FileText className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle>Gerar Documento</CardTitle>
            <CardDescription>
              Preencha os dados para gerar um novo documento
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="employee-select">Funcionário</Label>
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger id="employee-select" className="transition-all duration-200">
              <SelectValue placeholder="Selecione o funcionário" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {loadingEmployees ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : employees && employees.length > 0 ? (
                employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))
              ) : (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  Nenhum funcionário cadastrado
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="template-select">Tipo de Documento</Label>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger id="template-select" className="transition-all duration-200">
              <SelectValue placeholder="Selecione o tipo de documento" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : templates && templates.length > 0 ? (
                templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))
              ) : (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  Nenhum template cadastrado
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={generateDocument.isPending}
          className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-200 shadow-[var(--shadow-elegant)]"
        >
          {generateDocument.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando...
            </>
          ) : (
            "Gerar Documento"
          )}
        </Button>

        <Button
          onClick={handlePreview}
          variant="outline"
          className="w-full"
        >
          <Eye className="mr-2 h-4 w-4" />
          Pré-visualizar
        </Button>
      </CardContent>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Pré-visualização do Documento</DialogTitle>
            <DialogDescription>
              Revise o conteúdo antes de gerar o documento final
            </DialogDescription>
          </DialogHeader>
          
          {previewData && (
            <div className="space-y-4">
              <div className="border-b pb-2">
                <p className="text-sm font-semibold">Template: {previewData.template_name}</p>
                <p className="text-sm text-muted-foreground">Funcionário: {previewData.employee_name}</p>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {previewData.processedText}
                </pre>
              </div>

              {(previewData.company_logo_url || previewData.signature_url || previewData.stamp_url) && (
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold mb-2">Imagens incluídas:</p>
                  <div className="flex gap-4 flex-wrap">
                    {previewData.company_logo_url && (
                      <div className="text-center">
                        <img 
                          src={previewData.company_logo_url} 
                          alt="Logo" 
                          className="max-h-20 mx-auto mb-1"
                        />
                        <p className="text-xs text-muted-foreground">Logo da Empresa</p>
                      </div>
                    )}
                    {previewData.signature_url && (
                      <div className="text-center">
                        <img 
                          src={previewData.signature_url} 
                          alt="Assinatura" 
                          className="max-h-20 mx-auto mb-1"
                        />
                        <p className="text-xs text-muted-foreground">Assinatura</p>
                      </div>
                    )}
                    {previewData.stamp_url && (
                      <div className="text-center">
                        <img 
                          src={previewData.stamp_url} 
                          alt="Carimbo" 
                          className="max-h-20 mx-auto mb-1"
                        />
                        <p className="text-xs text-muted-foreground">Carimbo</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(false)}
            >
              Fechar
            </Button>
            <Button
              variant="secondary"
              onClick={handleDownloadPreview}
            >
              Baixar PDF
            </Button>
            <Button
              onClick={handleGenerateFromPreview}
              disabled={generateDocument.isPending}
            >
              {generateDocument.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                "Gerar e Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
