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
import { Badge } from "@/components/ui/badge";
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
import { exportToCSV } from "@/utils/exportUtils";
import { Download } from "lucide-react";

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
      
      <Card className="glass-card premium-shadow border-none overflow-hidden animate-in fade-in duration-300">
        <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-xl font-bold">
                {editingEmployee ? "Editar Funcionário" : "Novo Funcionário"}
              </CardTitle>
              <CardDescription className="text-sm">
                Manutenção do cadastro de colaboradores
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold">Nome Completo *</Label>
              <Input
                id="name"
                placeholder="Ex: João Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 glass-card"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="company" className="text-xs font-semibold">Empresa / Razão Social</Label>
              <Input
                id="company"
                placeholder="Empresa principal"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="h-10 glass-card"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cpf" className="text-xs font-semibold">CPF</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="h-10 glass-card"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rg" className="text-xs font-semibold">RG</Label>
              <Input
                id="rg"
                placeholder="00.000.000-0"
                value={rg}
                onChange={(e) => setRg(e.target.value)}
                className="h-10 glass-card"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="carteira" className="text-xs font-semibold">CTPS</Label>
              <Input
                id="carteira"
                placeholder="Número série/uf"
                value={numeroCarteiraTrabalho}
                onChange={(e) => setNumeroCarteiraTrabalho(e.target.value)}
                className="h-10 glass-card"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="coligada" className="text-xs font-semibold">Coligada Vinculada</Label>
              <Select value={coligadaId} onValueChange={setColigadaId}>
                <SelectTrigger className="h-10 glass-card">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  {coligadas?.map((coligada) => (
                    <SelectItem key={coligada.id} value={coligada.id}>
                      {coligada.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="position" className="text-xs font-semibold">Cargo / Função</Label>
              <Input
                id="position"
                placeholder="Ex: Gerente"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="h-10 glass-card"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agencia" className="text-xs font-semibold">Agência / Lotação</Label>
              <Input
                id="agencia"
                placeholder="Unidade de trabalho"
                value={agencia}
                onChange={(e) => setAgencia(e.target.value)}
                className="h-10 glass-card"
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

          <div className="space-y-2 p-3 md:p-4 rounded-lg bg-muted/50">
            <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Adicionar Campo Personalizado</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Nome do campo"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                className="h-10 bg-white/50"
              />
              <div className="flex gap-2 flex-1">
                <Input
                  placeholder="Valor"
                  value={newFieldValue}
                  onChange={(e) => setNewFieldValue(e.target.value)}
                  className="h-10 bg-white/50 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddField}
                  disabled={!newFieldName.trim() || !newFieldValue.trim()}
                  className="h-10 w-10 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <Button
              onClick={handleSave}
              disabled={saveEmployee.isPending}
              className="flex-1 h-10 text-base font-bold"
            >
              {saveEmployee.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                editingEmployee ? "Salvar Alterações" : "Cadastrar Agora"
              )}
            </Button>
            {editingEmployee && (
              <Button
                onClick={clearForm}
                variant="outline"
                className="h-10 px-6 glass-card"
                disabled={saveEmployee.isPending}
              >
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card premium-shadow border-none overflow-hidden animate-in fade-in duration-500">
        <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold">Base de Colaboradores</CardTitle>
              <CardDescription className="text-xs">
                {employees?.length || 0} registros ativos
              </CardDescription>
            </div>
            {employees && employees.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="glass-card h-10 px-4 hover:bg-accent/10 hover:text-accent transition-all duration-300 rounded-lg flex items-center gap-2"
                onClick={() => {
                  const columns = [
                    { key: 'name', label: 'Nome' },
                    { key: 'company', label: 'Empresa' },
                    { key: 'cpf', label: 'CPF' },
                    { key: 'rg', label: 'RG' },
                    { key: 'numero_carteira_trabalho', label: 'Carteira de Trabalho' },
                    { key: 'position', label: 'Função' },
                    { key: 'agencia', label: 'Agência' },
                  ];
                  
                  const dataWithColigada = employees.map(emp => ({
                    ...emp,
                    coligada_nome: coligadas?.find(c => c.id === emp.coligada_id)?.nome || ''
                  }));
                  
                  exportToCSV(dataWithColigada, 'funcionarios', [
                    ...columns,
                    { key: 'coligada_nome', label: 'Coligada' }
                  ]);
                  
                  toast({
                    title: "Relatório gerado!",
                    description: "A lista de funcionários foi exportada para CSV.",
                  });
                }}
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : employees && employees.length > 0 ? (
            <div className="space-y-4">
              {/* Tabela Desktop */}
              <div className="hidden md:block rounded-2xl overflow-hidden border border-primary/10 glass-card">
                <Table>
                  <TableHeader className="bg-primary/5">
                    <TableRow className="hover:bg-transparent border-primary/10">
                      <TableHead className="py-3 font-bold text-foreground text-xs uppercase tracking-wider tracking-tighter">Colaborador</TableHead>
                      <TableHead className="py-3 font-bold text-foreground text-xs uppercase tracking-wider tracking-tighter">Documentação</TableHead>
                      <TableHead className="py-3 font-bold text-foreground text-xs uppercase tracking-wider tracking-tighter">Cargo / Lotação</TableHead>
                      <TableHead className="py-3 font-bold text-foreground text-xs uppercase tracking-wider tracking-tighter">Empresa / Coligada</TableHead>
                      <TableHead className="py-3 font-bold text-foreground text-right text-xs uppercase tracking-wider tracking-tighter">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => {
                      const coligada = coligadas?.find(c => c.id === employee.coligada_id);
                      return (
                        <TableRow key={employee.id} className="hover:bg-primary/5 transition-colors border-primary/5">
                          <TableCell className="py-3">
                            <p className="font-bold text-base leading-none group-hover:text-primary transition-colors">{employee.name}</p>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex flex-col gap-1">
                              <code className="text-[10px] bg-muted/50 px-1.5 py-0.5 rounded w-fit">CPF: {employee.cpf || "N/A"}</code>
                              <code className="text-[10px] bg-muted/50 px-1.5 py-0.5 rounded w-fit">RG: {employee.rg || "N/A"}</code>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-semibold">{employee.position || "Não definido"}</span>
                              <span className="text-[10px] text-muted-foreground uppercase">{employee.agencia || "Sem agência"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-semibold">{employee.company || "-"}</span>
                              <span className="text-[10px] text-primary font-bold uppercase tracking-tighter">{coligada?.nome || "Vínculo externo"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(employee)}
                                disabled={deleteEmployee.isPending}
                                className="h-9 w-9 p-0 hover:bg-primary/10 hover:text-primary transition-all duration-300 rounded-lg"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteEmployee.mutate(employee.id)}
                                disabled={deleteEmployee.isPending}
                                className="h-9 w-9 p-0 hover:bg-destructive/10 hover:text-destructive transition-all duration-300 rounded-lg"
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

              {/* Grid Mobile */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {employees.map((employee) => {
                  const coligada = coligadas?.find(c => c.id === employee.coligada_id);
                  return (
                    <div key={employee.id} className="p-4 rounded-xl border border-primary/10 glass-card space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="font-bold text-lg leading-tight">{employee.name}</p>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/20 text-primary">CPF: {employee.cpf || "N/A"}</Badge>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/20 text-primary">RG: {employee.rg || "N/A"}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(employee)}
                            className="h-9 w-9 p-0 rounded-lg"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteEmployee.mutate(employee.id)}
                            className="h-9 w-9 p-0 rounded-lg hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-primary/5">
                        <div className="space-y-0.5">
                          <p className="text-[9px] uppercase font-bold text-muted-foreground">Cargo / Lotação</p>
                          <p className="text-xs font-semibold">{employee.position || "-"}</p>
                          <p className="text-[10px] text-muted-foreground">{employee.agencia || "Sem lotação"}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] uppercase font-bold text-muted-foreground">Empresa / Coligada</p>
                          <p className="text-xs font-semibold">{employee.company || "-"}</p>
                          <p className="text-[10px] text-primary font-bold">{coligada?.nome || "Externo"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
