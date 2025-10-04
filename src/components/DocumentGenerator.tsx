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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { FileText, Loader2 } from "lucide-react";

export const DocumentGenerator = () => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
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

      // Buscar funcionário pelo ID
      const employee = employees?.find((e) => e.id === selectedEmployeeId);
      
      if (!employee) {
        throw new Error("Funcionário não encontrado. Selecione um funcionário da lista.");
      }

      // Preparar dados para substituição no template
      const additionalData = (employee.additional_data || {}) as Record<string, any>;
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
        data_admissao: employee.hire_date || "",
        salario: employee.salary || "",
        endereco: employee.address || "",
        cidade: employee.city || "",
        estado: employee.state || "",
        cep: employee.zip_code || "",
        contato_emergencia: employee.emergency_contact || "",
        telefone_emergencia: employee.emergency_phone || "",
        ...additionalData,
      };

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
          data: templateData,
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
      </CardContent>
    </Card>
  );
};
