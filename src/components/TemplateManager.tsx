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
import { Plus, Settings, Trash2, FileText, Loader2 } from "lucide-react";

export const TemplateManager = () => {
  const [open, setOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
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

  const saveTemplate = useMutation({
    mutationFn: async () => {
      if (editingTemplate) {
        const { error } = await supabase
          .from("document_templates")
          .update({
            name,
            type,
            template_content: templateContent,
            description,
          })
          .eq("id", editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("document_templates").insert({
          name,
          type,
          template_content: templateContent,
          description,
          google_doc_id: "",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: editingTemplate ? "Template atualizado!" : "Template criado!",
        description: editingTemplate 
          ? "O template foi atualizado com sucesso." 
          : "O template foi cadastrado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      setOpen(false);
      setEditingTemplate(null);
      setName("");
      setType("");
      setTemplateContent("");
      setDescription("");
    },
    onError: (error) => {
      toast({
        title: editingTemplate ? "Erro ao atualizar template" : "Erro ao criar template",
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
    <Card className="glass-card premium-shadow border-none overflow-hidden animate-in fade-in duration-300">
      <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-xl font-bold">Biblioteca de Templates</CardTitle>
              <CardDescription className="text-sm">
                Modelos de documentos e textos padrão
              </CardDescription>
            </div>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
              setEditingTemplate(null);
              setName("");
              setType("");
              setTemplateContent("");
              setDescription("");
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 px-4 font-bold">
                <Plus className="h-4 w-4 mr-2" />
                Novo Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? "Editar Template" : "Adicionar Template"}</DialogTitle>
                <DialogDescription>
                  Escreva o conteúdo do template usando placeholders como {"`{{nome}}`"}, {"`{{cargo}}`"}, etc.
                  <br />
                  Para adicionar imagens, use: {"`{{assinatura}}`"} ou {"`{{carimbo}}`"}
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
                    placeholder="Exemplo:\n\nCarta de Apresentação\n\nA empresa {{empresa}} apresenta o colaborador {{nome}}, portador do RG {{rg}} e CPF {{cpf}}, para exercer a função de {{funcao}} na loja {{loja}}.\n\nData de emissão: {{data_emissao}}\n\nAtenciosamente,\nDepartamento de RH\n\n{{assinatura}}\n{{carimbo}}"
                    value={templateContent}
                    onChange={(e) => setTemplateContent(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use placeholders como: {`{{nome}}`}, {`{{rg}}`}, {`{{cpf}}`}, {`{{funcao}}`}, {`{{empresa}}`}, {`{{loja}}`}, {`{{data_emissao}}`}, {`{{cargo}}`}, {`{{email}}`}, {`{{telefone}}`}, {`{{assinatura}}`}, {`{{carimbo}}`}, etc.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => saveTemplate.mutate()}
                  disabled={!name || !type || !templateContent || saveTemplate.isPending}
                  className="bg-gradient-to-r from-primary to-accent"
                >
                  {editingTemplate ? "Atualizar Template" : "Salvar Template"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
          </div>
        ) : templates && templates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-6 rounded-2xl glass-card hover:premium-shadow hover-lift border-transparent hover:border-primary/10 transition-all duration-300 group flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-colors">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-widest border-primary/20 text-primary font-bold px-3">
                      {template.type}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">{template.name}</h4>
                    {template.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 italic">
                        {template.description}
                      </p>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-muted/30 border border-dashed border-muted-foreground/20">
                    <p className="text-xs text-muted-foreground font-mono line-clamp-3 leading-relaxed">
                      {template.template_content || "Sem conteúdo definido"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-6 border-t border-primary/5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-10 hover:bg-primary/10 hover:text-primary rounded-lg transition-all"
                    onClick={() => {
                      setEditingTemplate(template);
                      setName(template.name);
                      setType(template.type);
                      setTemplateContent(template.template_content || "");
                      setDescription(template.description || "");
                      setOpen(true);
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all"
                    onClick={() => deleteTemplate.mutate(template.id)}
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
