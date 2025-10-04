import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const CleanEmptyEmployees = () => {
  const queryClient = useQueryClient();

  const { data: emptyEmployees, isLoading } = useQuery({
    queryKey: ["empty-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .or("name.is.null,name.eq.");
      
      if (error) throw error;
      return data;
    },
  });

  const cleanEmployees = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("employees")
        .delete()
        .or("name.is.null,name.eq.");

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Limpeza concluída!",
        description: "Funcionários sem nome foram removidos.",
      });
      queryClient.invalidateQueries({ queryKey: ["empty-employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao limpar funcionários",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!emptyEmployees || emptyEmployees.length === 0) {
    return null;
  }

  return (
    <Card className="border-destructive">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <CardTitle>Funcionários sem Nome Detectados</CardTitle>
            <CardDescription>
              {emptyEmployees.length} funcionário(s) sem nome encontrado(s)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção</AlertTitle>
          <AlertDescription>
            Funcionários sem nome não podem ser usados para gerar documentos.
            Clique no botão abaixo para remover todos os funcionários sem nome.
          </AlertDescription>
        </Alert>

        <Button
          onClick={() => cleanEmployees.mutate()}
          disabled={cleanEmployees.isPending}
          variant="destructive"
          className="w-full"
        >
          {cleanEmployees.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Limpando...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              Remover {emptyEmployees.length} Funcionário(s) Vazio(s)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
