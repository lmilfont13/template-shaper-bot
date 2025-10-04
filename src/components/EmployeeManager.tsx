import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Users, Loader2, Trash2, Edit } from "lucide-react";
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
import { LogoUpload } from "./LogoUpload";
import { ImageUpload } from "./ImageUpload";

export const EmployeeManager = () => {
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [rg, setRg] = useState("");
  const [cpf, setCpf] = useState("");
  const [letterIssueDate, setLetterIssueDate] = useState("");
  const [position, setPosition] = useState("");
  const [company, setCompany] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [stampUrl, setStampUrl] = useState("");
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

  const saveEmployee = useMutation({
    mutationFn: async () => {
      const employeeData = {
        name,
        store_name: storeName,
        rg,
        cpf,
        letter_issue_date: letterIssueDate || null,
        position,
        company,
        company_logo_url: companyLogoUrl || null,
        email,
        phone,
        department,
        signature_url: signatureUrl || null,
        stamp_url: stampUrl || null,
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
    setStoreName("");
    setRg("");
    setCpf("");
    setLetterIssueDate("");
    setPosition("");
    setCompany("");
    setCompanyLogoUrl("");
    setEmail("");
    setPhone("");
    setDepartment("");
    setSignatureUrl("");
    setStampUrl("");
  };

  const handleEdit = (employee: any) => {
    setEditingEmployee(employee.id);
    setName(employee.name || "");
    setStoreName(employee.store_name || "");
    setRg(employee.rg || "");
    setCpf(employee.cpf || "");
    setLetterIssueDate(employee.letter_issue_date || "");
    setPosition(employee.position || "");
    setCompany(employee.company || "");
    setCompanyLogoUrl(employee.company_logo_url || "");
    setEmail(employee.email || "");
    setPhone(employee.phone || "");
    setDepartment(employee.department || "");
    setSignatureUrl(employee.signature_url || "");
    setStampUrl(employee.stamp_url || "");
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
              <Label htmlFor="name">Nome do Colaborador*</Label>
              <Input
                id="name"
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store-name">Nome da Loja</Label>
              <Input
                id="store-name"
                placeholder="Ex: Loja Centro"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
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
              <Label htmlFor="letter-date">Data de Emissão da Carta</Label>
              <Input
                id="letter-date"
                type="date"
                value={letterIssueDate}
                onChange={(e) => setLetterIssueDate(e.target.value)}
                className="transition-all duration-200"
              />
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
              <Label htmlFor="department">Departamento</Label>
              <Input
                id="department"
                placeholder="Ex: Vendas"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="transition-all duration-200"
              />
            </div>

            <div className="col-span-2">
              <LogoUpload
                currentLogoUrl={companyLogoUrl}
                onLogoUploaded={setCompanyLogoUrl}
                onLogoRemoved={() => setCompanyLogoUrl("")}
              />
            </div>

            <div className="space-y-2">
              <ImageUpload
                id="signature-upload"
                label="Assinatura"
                currentImageUrl={signatureUrl}
                onImageUploaded={setSignatureUrl}
                onImageRemoved={() => setSignatureUrl("")}
                folder="signatures"
              />
            </div>

            <div className="space-y-2">
              <ImageUpload
                id="stamp-upload"
                label="Carimbo"
                currentImageUrl={stampUrl}
                onImageUploaded={setStampUrl}
                onImageRemoved={() => setStampUrl("")}
                folder="stamps"
              />
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
                    <TableHead>Loja</TableHead>
                    <TableHead>RG</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.store_name || "-"}</TableCell>
                      <TableCell>{employee.rg || "-"}</TableCell>
                      <TableCell>{employee.cpf || "-"}</TableCell>
                      <TableCell>{employee.position || "-"}</TableCell>
                      <TableCell>{employee.company || "-"}</TableCell>
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
