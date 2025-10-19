import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { FileText, Loader2, Eye, CheckSquare, Square } from "lucide-react";
import { generatePDFFromTemplate } from "@/utils/pdfFromTemplate";

export const DocumentGenerator = () => {
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [selectedColigadaId, setSelectedColigadaId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [storeName, setStoreName] = useState("");
  const [agenciaFilter, setAgenciaFilter] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [editableData, setEditableData] = useState<Record<string, any>>({});
  const [showDataEditor, setShowDataEditor] = useState(false);
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

  const { data: coligadas, isLoading: loadingColigadas } = useQuery({
    queryKey: ["coligadas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coligadas")
        .select("*")
        .order("nome");
      
      if (error) throw error;
      return data;
    },
  });

  const generateDocument = useMutation({
    mutationFn: async () => {
      const template = templates?.find((t) => t.id === selectedTemplate);
      if (!template) throw new Error("Template não encontrado");

      const coligada = coligadas?.find((c) => c.id === selectedColigadaId);
      
      if (!coligada) {
        throw new Error("Coligada não encontrada. Selecione uma coligada da lista.");
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const selectedEmployees = employees?.filter((e) => selectedEmployeeIds.includes(e.id)) || [];
      
      if (selectedEmployees.length === 0) {
        throw new Error("Nenhum funcionário selecionado.");
      }

      const documentsToInsert = [];

      for (const employee of selectedEmployees) {
        // Se há dados editáveis (veio do preview), usar eles; senão usar dados originais
        const templateData: Record<string, any> = Object.keys(editableData).length > 0 ? editableData : {
          nome: employee.name,
          nome_colaborador: employee.name,
          loja: storeName || employee.store_name || "",
          nome_loja: storeName || employee.store_name || "",
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

        // Processar template se houver conteúdo
        let processedText = template.template_content || "";
        if (processedText) {
          Object.entries(templateData).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`;
            processedText = processedText.replace(new RegExp(placeholder, 'gi'), value);
          });
        }

        documentsToInsert.push({
          employee_name: employee.name,
          template_id: selectedTemplate,
          template_name: template.name,
          coligada_id: selectedColigadaId,
          coligada_name: coligada.nome,
          status: "completed",
          data: { 
            ...templateData, 
            processedText,
            company_logo_url: coligada.company_logo_url || undefined,
            signature_url: coligada.signature_url || undefined,
            stamp_url: coligada.stamp_url || undefined,
            coligada_endereco: coligada.endereco || undefined,
            created_at: new Date().toISOString(),
          },
          user_id: user.id,
        });
      }

      const { error } = await supabase
        .from("generated_documents")
        .insert(documentsToInsert);

      if (error) throw error;
      
      return documentsToInsert;
    },
    onSuccess: (data) => {
      toast({
        title: "Documentos gerados!",
        description: `${data.length} documento(s) criado(s) com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["generated-documents"] });
      setSelectedEmployeeIds([]);
      setSelectedColigadaId("");
      setSelectedTemplate("");
      setStoreName("");
      setEditableData({});
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
    if (selectedEmployeeIds.length === 0) {
      toast({
        title: "Funcionário obrigatório",
        description: "Por favor, selecione pelo menos um funcionário.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedColigadaId) {
      toast({
        title: "Coligada obrigatória",
        description: "Por favor, selecione uma coligada.",
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

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const toggleSelectAll = () => {
    const filteredEmployees = getFilteredEmployees();
    if (selectedEmployeeIds.length === filteredEmployees?.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(filteredEmployees?.map((e) => e.id) || []);
    }
  };

  const getFilteredEmployees = () => {
    if (!employees) return [];
    if (!agenciaFilter) return employees;
    return employees.filter((emp) => emp.agencia === agenciaFilter);
  };

  const uniqueAgencias = Array.from(new Set(employees?.map((e) => e.agencia).filter(Boolean) || []));

  const handlePreview = () => {
    if (selectedEmployeeIds.length === 0) {
      toast({
        title: "Funcionário obrigatório",
        description: "Por favor, selecione pelo menos um funcionário.",
        variant: "destructive",
      });
      return;
    }

    if (selectedEmployeeIds.length > 1) {
      toast({
        title: "Pré-visualização limitada",
        description: "Selecione apenas um funcionário para pré-visualizar e editar.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedColigadaId) {
      toast({
        title: "Coligada obrigatória",
        description: "Por favor, selecione uma coligada.",
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
    const employee = employees?.find((e) => e.id === selectedEmployeeIds[0]);
    const coligada = coligadas?.find((c) => c.id === selectedColigadaId);
    
    if (!template || !employee || !coligada) return;

    // Preparar dados editáveis
    const templateData: Record<string, any> = {
      nome: employee.name,
      nome_colaborador: employee.name,
      loja: storeName || employee.store_name || "",
      nome_loja: storeName || employee.store_name || "",
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

    setEditableData(templateData);
    setShowDataEditor(true);
  };

  const handleContinueToPreview = () => {
    const template = templates?.find((t) => t.id === selectedTemplate);
    const coligada = coligadas?.find((c) => c.id === selectedColigadaId);
    
    if (!template || !coligada) return;

    // Processar template com dados editados
    let processedText = template.template_content || "";
    let previewText = processedText;
    
    if (processedText) {
      Object.entries(editableData).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        processedText = processedText.replace(new RegExp(placeholder, 'gi'), value);
      });
      previewText = processedText;
    }

    // Substituir placeholders de imagens para preview
    if (coligada.signature_url && previewText.includes('{{assinatura}}')) {
      previewText = previewText.replace(/{{assinatura}}/gi, '[ASSINATURA SERÁ INSERIDA AQUI]');
    }
    if (coligada.stamp_url && previewText.includes('{{carimbo}}')) {
      previewText = previewText.replace(/{{carimbo}}/gi, '[CARIMBO SERÁ INSERIDO AQUI]');
    }

    setPreviewData({
      employee_name: editableData.nome || editableData.nome_colaborador,
      coligada_name: coligada.nome,
      template_name: template.name,
      processedText: previewText,
      originalProcessedText: processedText,
      company_logo_url: coligada.company_logo_url,
      signature_url: coligada.signature_url,
      stamp_url: coligada.stamp_url,
      coligada_endereco: coligada.endereco,
      created_at: new Date().toISOString(),
    });
    setShowDataEditor(false);
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
          <div className="flex items-center justify-between">
            <Label>Funcionários</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleSelectAll}
              className="h-8"
            >
              {selectedEmployeeIds.length === getFilteredEmployees()?.length && getFilteredEmployees().length > 0 ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Limpar Seleção
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Selecionar Todos
                </>
              )}
            </Button>
          </div>
          {uniqueAgencias.length > 0 && (
            <div className="flex gap-2 items-center">
              <Select value={agenciaFilter || undefined} onValueChange={setAgenciaFilter}>
                <SelectTrigger className="transition-all duration-200">
                  <SelectValue placeholder="Todas as agências" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {uniqueAgencias.map((agencia) => (
                    <SelectItem key={agencia} value={agencia}>
                      {agencia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {agenciaFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAgenciaFilter("")}
                  className="h-8 px-2"
                >
                  Limpar
                </Button>
              )}
            </div>
          )}
          <ScrollArea className="h-[200px] border rounded-md p-4">
            {loadingEmployees ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : getFilteredEmployees().length > 0 ? (
              <div className="space-y-3">
                {getFilteredEmployees().map((employee) => (
                  <div key={employee.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`employee-${employee.id}`}
                      checked={selectedEmployeeIds.includes(employee.id)}
                      onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                    />
                    <label
                      htmlFor={`employee-${employee.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {employee.name} {employee.agencia && `(${employee.agencia})`}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-sm text-muted-foreground">
                {agenciaFilter ? "Nenhum funcionário nesta agência" : "Nenhum funcionário cadastrado"}
              </div>
            )}
          </ScrollArea>
          {selectedEmployeeIds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedEmployeeIds.length} funcionário(s) selecionado(s)
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="coligada-select">Coligada</Label>
          <Select value={selectedColigadaId} onValueChange={setSelectedColigadaId}>
            <SelectTrigger id="coligada-select" className="transition-all duration-200">
              <SelectValue placeholder="Selecione a coligada" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {loadingColigadas ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : coligadas && coligadas.length > 0 ? (
                coligadas.map((coligada) => (
                  <SelectItem key={coligada.id} value={coligada.id}>
                    {coligada.nome}
                  </SelectItem>
                ))
              ) : (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  Nenhuma coligada cadastrada
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

        <div className="space-y-2">
          <Label htmlFor="store-name">Nome da Loja</Label>
          <Input
            id="store-name"
            type="text"
            placeholder="Digite o nome da loja"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="transition-all duration-200"
          />
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

      {/* Dialog de Edição de Dados */}
      <Dialog open={showDataEditor} onOpenChange={setShowDataEditor}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisar e Editar Dados do Mapeamento</DialogTitle>
            <DialogDescription>
              Revise e ajuste os dados antes de gerar o documento. Você pode alterar qualquer campo sem precisar reimportar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {Object.entries(editableData).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`edit-${key}`} className="text-sm font-medium capitalize">
                  {key.replace(/_/g, ' ')}
                </Label>
                <Input
                  id={`edit-${key}`}
                  value={value}
                  onChange={(e) => setEditableData(prev => ({ ...prev, [key]: e.target.value }))}
                  className="w-full"
                />
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDataEditor(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleContinueToPreview}
            >
              Continuar para Pré-visualização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Preview */}
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
                <p className="text-sm text-muted-foreground">Coligada: {previewData.coligada_name}</p>
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
              onClick={() => {
                setPreviewOpen(false);
                setShowDataEditor(true);
              }}
            >
              Voltar para Edição
            </Button>
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
