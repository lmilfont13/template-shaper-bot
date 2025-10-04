import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Settings, Trash2, FileText } from "lucide-react";

export const TemplateManager = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [templateContent, setTemplateContent] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
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

  const createTemplate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("document_templates").insert({
        name,
        type,
        template_content: templateContent,
        description,
        google_doc_id: "", // Mantém por compatibilidade mas não é mais necessário
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Template criado!",
        description: "O template foi cadastrado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      setOpen(false);
      setName("");
      setType("");
      setTemplateContent("");
      setDescription("");
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("document_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Template removido",
        description: "O template foi excluído com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
    },
  });

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Settings className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle>Gerenciar Templates</CardTitle>
              <CardDescription>
                Crie e gerencie templates de documentos
              </CardDescription>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-accent">
                <Plus className="h-4 w-4 mr-2" />
                Novo Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Adicionar Template</DialogTitle>
                <DialogDescription>
                  Escreva o conteúdo do template usando placeholders como {"`{{nome}}`"}, {"`{{cargo}}`"}, etc.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Nome do Template</Label>
                  <Input
                    id="template-name"
                    placeholder="Ex: Carta de Apresentação"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-type">Tipo</Label>
                  <Input
                    id="template-type"
                    placeholder="Ex: Carta"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Input
                    id="description"
                    placeholder="Breve descrição do template"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-content">Conteúdo do Template</Label>
                  <Textarea
                    id="template-content"
                    placeholder="Exemplo:\n\nCarta de Apresentação\n\nA empresa [empresa] apresenta o colaborador [nome], portador do RG [rg] e CPF [cpf], para exercer a função de [funcao] na loja [loja].\n\nData de emissão: [data_emissao]\n\nAtenciosamente,\nDepartamento de RH\n\nNota: Use {{campo}} no seu template, não []"
                    value={templateContent}
                    onChange={(e) => setTemplateContent(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use placeholders como: {`{{nome}}`}, {`{{rg}}`}, {`{{cpf}}`}, {`{{funcao}}`}, {`{{empresa}}`}, {`{{loja}}`}, {`{{data_emissao}}`}, {`{{cargo}}`}, {`{{email}}`}, {`{{telefone}}`}, etc.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => createTemplate.mutate()}
                  disabled={!name || !type || !templateContent || createTemplate.isPending}
                  className="bg-gradient-to-r from-primary to-accent"
                >
                  Salvar Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : templates && templates.length > 0 ? (
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{template.name}</h4>
                        <Badge variant="secondary">{template.type}</Badge>
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      )}
                      {template.template_content && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {template.template_content}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTemplate.mutate(template.id)}
                    className="hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground mb-4">
              Nenhum template cadastrado ainda
            </p>
            <Button
              onClick={() => setOpen(true)}
              variant="outline"
              className="hover:bg-primary hover:text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Template
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
