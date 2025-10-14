import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Users, Loader2, Trash2, Edit, Plus, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { RemoveDuplicates } from "./RemoveDuplicates";

export const EmployeeManager = () => {
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [numeroCarteiraTrabalho, setNumeroCarteiraTrabalho] = useState("");
  const [coligadaId, setColigadaId] = useState("");
  const [position, setPosition] = useState("");
  const [agencia, setAgencia] = useState("");
  const [additionalFields, setAdditionalFields] = useState<Record<string, string>>({});
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const queryClient = useQueryClient();

  const { data: coligadas } = useQuery({
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

  const saveEmployee = useMutation({
    mutationFn: async () => {
      const employeeData = {
        name,
        company,
        cpf,
        rg,
        numero_carteira_trabalho: numeroCarteiraTrabalho || null,
        coligada_id: coligadaId || null,
        position,
        agencia: agencia || null,
        additional_data: additionalFields,
      };

      if (editingEmployee) {
        const { data, error } = await supabase
          .from("employees")
          .update(employeeData)
          .eq("id", editingEmployee)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("employees")
          .insert(employeeData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast({
        title: editingEmployee ? "Funcionário atualizado!" : "Funcionário cadastrado!",
        description: editingEmployee 
          ? "O funcionário foi atualizado com sucesso."
          : "O funcionário foi adicionado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      clearForm();
    },
    onError: (error) => {
      toast({
        title: editingEmployee ? "Erro ao atualizar funcionário" : "Erro ao cadastrar funcionário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const clearForm = () => {
    setEditingEmployee(null);
    setName("");
    setCompany("");
    setCpf("");
    setRg("");
    setNumeroCarteiraTrabalho("");
    setColigadaId("");
    setPosition("");
    setAgencia("");
    setAdditionalFields({});
    setNewFieldName("");
    setNewFieldValue("");
  };

  const handleEdit = (employee: any) => {
    setEditingEmployee(employee.id);
    setName(employee.name || "");
    setCompany(employee.company || "");
    setCpf(employee.cpf || "");
    setRg(employee.rg || "");
    setNumeroCarteiraTrabalho(employee.numero_carteira_trabalho || "");
    setColigadaId(employee.coligada_id || "");
    setPosition(employee.position || "");
    setAgencia(employee.agencia || "");
    setAdditionalFields(employee.additional_data || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddField = () => {
    if (newFieldName.trim() && newFieldValue.trim()) {
      setAdditionalFields(prev => ({
        ...prev,
        [newFieldName]: newFieldValue
      }));
      setNewFieldName("");
      setNewFieldValue("");
    }
  };

  const handleRemoveField = (fieldName: string) => {
    setAdditionalFields(prev => {
      const newFields = { ...prev };
      delete newFields[fieldName];
      return newFields;
    });
  };

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

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira o nome do funcionário.",
        variant: "destructive",
      });
      return;
    }

    saveEmployee.mutate();
  };

  return (
    <div className="space-y-6">
      <CleanEmptyEmployees />
      <RemoveDuplicates />
      <EmployeeImport />
      
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Users className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle>{editingEmployee ? "Editar Funcionário" : "Cadastrar Funcionário"}</CardTitle>
              <CardDescription>
                {editingEmployee ? "Atualize os dados do funcionário" : "Adicione os dados dos funcionários para usar nos documentos"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome*</Label>
              <Input
                id="name"
                placeholder="Nome completo do funcionário"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Input
                id="company"
                placeholder="Nome da empresa"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rg">RG</Label>
              <Input
                id="rg"
                placeholder="00.000.000-0"
                value={rg}
                onChange={(e) => setRg(e.target.value)}
                className="transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="carteira">Número Carteira de Trabalho</Label>
              <Input
                id="carteira"
                placeholder="Número da carteira"
                value={numeroCarteiraTrabalho}
                onChange={(e) => setNumeroCarteiraTrabalho(e.target.value)}
                className="transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coligada">Coligada</Label>
              <Select value={coligadaId} onValueChange={setColigadaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma coligada" />
                </SelectTrigger>
                <SelectContent>
                  {coligadas?.map((coligada) => (
                    <SelectItem key={coligada.id} value={coligada.id}>
                      {coligada.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Função</Label>
              <Input
                id="position"
                placeholder="Ex: Vendedor"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agencia">Agência</Label>
              <Input
                id="agencia"
                placeholder="Nome ou número da agência"
                value={agencia}
                onChange={(e) => setAgencia(e.target.value)}
                className="transition-all duration-200"
              />
            </div>
          </div>

          {Object.keys(additionalFields).length > 0 && (
            <div className="space-y-2">
              <Label>Campos Adicionais</Label>
              <div className="space-y-2">
                {Object.entries(additionalFields).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                    <span className="font-medium flex-1">{key}:</span>
                    <span className="flex-1">{value}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveField(key)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 p-4 rounded-lg bg-muted/50">
            <Label>Adicionar Campo Personalizado</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Nome do campo"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
              />
              <Input
                placeholder="Valor"
                value={newFieldValue}
                onChange={(e) => setNewFieldValue(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddField}
                disabled={!newFieldName.trim() || !newFieldValue.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={saveEmployee.isPending}
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-200 shadow-[var(--shadow-elegant)]"
            >
              {saveEmployee.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingEmployee ? "Atualizando..." : "Cadastrando..."}
                </>
              ) : (
                editingEmployee ? "Atualizar Funcionário" : "Cadastrar Funcionário"
              )}
            </Button>
            {editingEmployee && (
              <Button
                onClick={clearForm}
                variant="outline"
                disabled={saveEmployee.isPending}
              >
                Cancelar
              </Button>
            )}
          </div>
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
                    <TableHead>Empresa</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>RG</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Coligada</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => {
                    const coligada = coligadas?.find(c => c.id === employee.coligada_id);
                    return (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>{employee.company || "-"}</TableCell>
                        <TableCell>{employee.cpf || "-"}</TableCell>
                        <TableCell>{employee.rg || "-"}</TableCell>
                        <TableCell>{employee.position || "-"}</TableCell>
                        <TableCell>{coligada?.nome || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(employee)}
                              disabled={deleteEmployee.isPending}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteEmployee.mutate(employee.id)}
                              disabled={deleteEmployee.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
