import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { UserX, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const RemoveDuplicates = () => {
  const queryClient = useQueryClient();
  const [duplicatesInfo, setDuplicatesInfo] = useState<{ total: number; duplicates: number } | null>(null);

  const removeDuplicates = useMutation({
    mutationFn: async () => {
      // Buscar todos os funcionários
      const { data: employees, error: fetchError } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;

      if (!employees || employees.length === 0) {
        return { removed: 0, total: 0 };
      }

      // Agrupar por CPF (ignorando vazios)
      const grouped = new Map<string, any[]>();
      const noCpf: any[] = [];

      employees.forEach((emp) => {
        if (emp.cpf && emp.cpf.trim()) {
          const cpf = emp.cpf.trim();
          if (!grouped.has(cpf)) {
            grouped.set(cpf, []);
          }
          grouped.get(cpf)!.push(emp);
        } else {
          noCpf.push(emp);
        }
      });

      // Identificar duplicados (manter o mais antigo)
      const toDelete: string[] = [];
      
      grouped.forEach((group) => {
        if (group.length > 1) {
          // Ordenar por data de criação e manter o primeiro (mais antigo)
          group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          // Adicionar os demais para exclusão
          for (let i = 1; i < group.length; i++) {
            toDelete.push(group[i].id);
          }
        }
      });

      // Remover duplicados
      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("employees")
          .delete()
          .in("id", toDelete);

        if (deleteError) throw deleteError;
      }

      return {
        removed: toDelete.length,
        total: employees.length,
        kept: employees.length - toDelete.length
      };
    },
    onSuccess: (result) => {
      setDuplicatesInfo({
        total: result.total,
        duplicates: result.removed
      });
      
      toast({
        title: "Duplicados removidos!",
        description: `${result.removed} funcionário(s) duplicado(s) foram removidos. ${result.kept} funcionário(s) mantidos.`,
      });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover duplicados",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="shadow-[var(--shadow-card)] border-l-4 border-l-destructive/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <UserX className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <CardTitle>Remover Duplicados</CardTitle>
            <CardDescription>
              Remove funcionários com CPF duplicado (mantém o registro mais antigo)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {duplicatesInfo && (
          <div className="mb-4 p-3 rounded-lg bg-muted text-sm">
            <p>Última verificação: {duplicatesInfo.duplicates} duplicado(s) de {duplicatesInfo.total} total</p>
          </div>
        )}
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={removeDuplicates.isPending}
              className="w-full"
            >
              {removeDuplicates.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removendo...
                </>
              ) : (
                <>
                  <UserX className="mr-2 h-4 w-4" />
                  Remover Duplicados
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar remoção de duplicados?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá remover todos os funcionários com CPF duplicado,
                mantendo apenas o registro mais antigo de cada CPF.
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => removeDuplicates.mutate()}
                className="bg-destructive hover:bg-destructive/90"
              >
                Remover Duplicados
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};