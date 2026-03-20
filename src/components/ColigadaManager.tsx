import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Building2, Pencil, Trash2, Plus, Loader2 } from "lucide-react";
import { LogoUpload } from "./LogoUpload";
import { ImageUpload } from "./ImageUpload";
import { getStorageUrl } from "@/utils/supabaseStorage";

interface Coligada {
  id: string;
  nome: string;
  endereco: string | null;
  company_logo_url: string | null;
  signature_url: string | null;
  stamp_url: string | null;
  created_at: string;
  updated_at: string;
}

export const ColigadaManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingColigada, setEditingColigada] = useState<Coligada | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    endereco: "",
    company_logo_url: "",
    signature_url: "",
    stamp_url: "",
  });
  const queryClient = useQueryClient();

  const { data: coligadas, isLoading } = useQuery({
    queryKey: ["coligadas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coligadas")
        .select("*")
        .order("nome");
      
      if (error) throw error;
      return data as Coligada[];
    },
  });

  const saveColigada = useMutation({
    mutationFn: async () => {
      if (editingColigada) {
        const { error } = await supabase
          .from("coligadas")
          .update(formData)
          .eq("id", editingColigada.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("coligadas")
          .insert([formData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: editingColigada ? "Coligada atualizada!" : "Coligada cadastrada!",
        description: "As informações foram salvas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["coligadas"] });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar coligada",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteColigada = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("coligadas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Coligada removida",
        description: "A coligada foi excluída com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["coligadas"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover coligada",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (coligada?: Coligada) => {
    if (coligada) {
      setEditingColigada(coligada);
      setFormData({
        nome: coligada.nome,
        endereco: coligada.endereco || "",
        company_logo_url: coligada.company_logo_url || "",
        signature_url: coligada.signature_url || "",
        stamp_url: coligada.stamp_url || "",
      });
    } else {
      setEditingColigada(null);
      setFormData({
        nome: "",
        endereco: "",
        company_logo_url: "",
        signature_url: "",
        stamp_url: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingColigada(null);
    setFormData({
      nome: "",
      endereco: "",
      company_logo_url: "",
      signature_url: "",
      stamp_url: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome da coligada.",
        variant: "destructive",
      });
      return;
    }
    saveColigada.mutate();
  };

  return (
    <Card className="glass-card premium-shadow border-none overflow-hidden animate-in fade-in duration-500">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent border-b border-primary/10 pb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary shadow-lg shadow-primary/20 transform transition-transform hover:scale-110 duration-300">
              <Building2 className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">Gestão de Coligadas</CardTitle>
              <CardDescription className="text-base text-muted-foreground/80">
                Configure as empresas, logotipos e assinaturas oficiais
              </CardDescription>
            </div>
          </div>
          <Button 
            onClick={() => handleOpenDialog()} 
            className="h-12 px-6 bg-gradient-to-r from-primary to-accent hover:opacity-90 hover:scale-[1.02] transition-all duration-300 premium-shadow rounded-xl font-bold"
          >
            <Plus className="h-5 w-5 mr-2" />
            Adicionar Coligada
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : coligadas && coligadas.length > 0 ? (
          <div className="rounded-2xl overflow-hidden border border-primary/10 glass-card">
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow className="hover:bg-transparent border-primary/10">
                  <TableHead className="py-5 font-bold text-foreground">Identificação</TableHead>
                  <TableHead className="py-5 font-bold text-foreground">Logo</TableHead>
                  <TableHead className="py-5 font-bold text-foreground">Assinatura</TableHead>
                  <TableHead className="py-5 font-bold text-foreground">Carimbo</TableHead>
                  <TableHead className="py-5 font-bold text-foreground text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coligadas.map((coligada) => (
                  <TableRow key={coligada.id} className="hover:bg-primary/5 transition-colors duration-200 border-primary/5">
                    <TableCell className="py-5">
                      <div className="space-y-0.5">
                        <p className="font-bold text-base leading-none">{coligada.nome}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{coligada.endereco || "Endereço não informado"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-5">
                      {coligada.company_logo_url ? (
                        <div className="p-1 rounded-lg bg-white shadow-sm inline-block">
                          <img src={getStorageUrl(coligada.company_logo_url)} alt="Logo" className="h-10 w-auto object-contain" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted/20 flex items-center justify-center">
                          <Building2 className="h-4 w-4 opacity-20" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-5">
                      {coligada.signature_url ? (
                        <div className="p-1 rounded-lg bg-white shadow-sm inline-block">
                          <img src={getStorageUrl(coligada.signature_url)} alt="Assinatura" className="h-10 w-auto object-contain" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted/20 flex items-center justify-center">
                          <Pencil className="h-4 w-4 opacity-20" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-5">
                      {coligada.stamp_url ? (
                        <div className="p-1 rounded-lg bg-white shadow-sm inline-block">
                          <img src={getStorageUrl(coligada.stamp_url)} alt="Carimbo" className="h-10 w-auto object-contain" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted/20 flex items-center justify-center">
                          <div className="h-4 w-4 rounded-full border-2 border-dashed opacity-20" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-5 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(coligada)}
                          className="h-10 w-10 p-0 hover:bg-primary/10 hover:text-primary transition-all duration-300 rounded-lg"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteColigada.mutate(coligada.id)}
                          className="h-10 w-10 p-0 hover:bg-destructive/10 hover:text-destructive transition-all duration-300 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Nenhuma coligada cadastrada ainda</p>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingColigada ? "Editar Coligada" : "Nova Coligada"}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações da coligada e faça upload das imagens
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Coligada *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Matriz São Paulo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                placeholder="Ex: Rua Exemplo, 123 - São Paulo/SP"
              />
            </div>

            <div className="space-y-4">
              <LogoUpload
                currentLogoUrl={formData.company_logo_url}
                onLogoUploaded={(url) => setFormData({ ...formData, company_logo_url: url })}
                onLogoRemoved={() => setFormData({ ...formData, company_logo_url: "" })}
              />

              <ImageUpload
                label="Assinatura"
                currentImageUrl={formData.signature_url}
                onImageUploaded={(url) => setFormData({ ...formData, signature_url: url })}
                onImageRemoved={() => setFormData({ ...formData, signature_url: "" })}
                folder="signatures"
                id="signature"
              />

              <ImageUpload
                label="Carimbo"
                currentImageUrl={formData.stamp_url}
                onImageUploaded={(url) => setFormData({ ...formData, stamp_url: url })}
                onImageRemoved={() => setFormData({ ...formData, stamp_url: "" })}
                folder="stamps"
                id="stamp"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveColigada.isPending}>
                {saveColigada.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};