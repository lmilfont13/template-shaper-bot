import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Users, Loader2, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmployeeImport } from "./EmployeeImport";
import { CleanEmptyEmployees } from "./CleanEmptyEmployees";

export const EmployeeManager = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const queryClient = useQueryClient();

  const { data: employees, isLoading } = useQuery({
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

  const createEmployee = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .insert({
          name,
          email,
          phone,
          position,
          department,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Funcionário cadastrado!",
        description: "O funcionário foi adicionado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setName("");
      setEmail("");
      setPhone("");
      setPosition("");
      setDepartment("");
    },
    onError: (error) => {
      toast({
        title: "Erro ao cadastrar funcionário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Funcionário removido!",
        description: "O funcionário foi removido com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover funcionário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira o nome do funcionário.",
        variant: "destructive",
      });
      return;
    }

    createEmployee.mutate();
  };

  return (
    <div className="space-y-6">
      <CleanEmptyEmployees />
      <EmployeeImport />
      
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Users className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle>Cadastrar Funcionário</CardTitle>
              <CardDescription>
                Adicione os dados dos funcionários para usar nos documentos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo*</Label>
              <Input
                id="name"
                placeholder="Nome do funcionário"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Cargo</Label>
              <Input
                id="position"
                placeholder="Ex: Analista de RH"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Input
                id="department"
                placeholder="Ex: Recursos Humanos"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="transition-all duration-200"
              />
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={createEmployee.isPending}
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-200 shadow-[var(--shadow-elegant)]"
          >
            {createEmployee.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cadastrando...
              </>
            ) : (
              "Cadastrar Funcionário"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle>Funcionários Cadastrados</CardTitle>
          <CardDescription>
            Lista de todos os funcionários no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : employees && employees.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.email || "-"}</TableCell>
                      <TableCell>{employee.phone || "-"}</TableCell>
                      <TableCell>{employee.position || "-"}</TableCell>
                      <TableCell>{employee.department || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteEmployee.mutate(employee.id)}
                          disabled={deleteEmployee.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum funcionário cadastrado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
