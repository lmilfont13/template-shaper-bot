import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, Search, Download, Calendar, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { generatePDFFromTemplate } from "@/utils/pdfFromTemplate";

export const DocumentHistory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (doc: any) => {
    try {
      setDownloadingId(doc.id);

      // Buscar o template para pegar o google_doc_id
      const { data: template } = await supabase
        .from('document_templates')
        .select('google_doc_id')
        .eq('id', doc.template_id)
        .single();

      // Buscar funcionário para pegar ID
      const { data: employee } = await supabase
        .from('employees')
        .select('id, company_logo_url')
        .eq('name', doc.employee_name)
        .maybeSingle();

      if (!employee || !template) {
        throw new Error('Dados do documento não encontrados');
      }

      // Processar template novamente para gerar PDF
      const { data: processedData, error: processError } = await supabase.functions.invoke('process-template', {
        body: {
          templateId: doc.template_id,
          employeeId: employee.id,
        }
      });

      if (processError || !processedData?.success) {
        throw new Error(processedData?.error || 'Erro ao processar template');
      }

      // Gerar PDF com o conteúdo do template
      await generatePDFFromTemplate({
        employee_name: doc.employee_name,
        template_name: doc.template_name,
        processedText: processedData.processedText,
        company_logo_url: employee.company_logo_url,
        created_at: doc.created_at,
      });
      
      toast({
        title: "Download concluído!",
        description: "O documento foi baixado com sucesso.",
      });
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: error.message || "Não foi possível gerar o documento.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const { data: documents, isLoading } = useQuery({
    queryKey: ["generated-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_documents")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Buscar logos dos funcionários
      if (data && data.length > 0) {
        const employeeNames = [...new Set(data.map(d => d.employee_name))];
        const { data: employeesData } = await supabase
          .from("employees")
          .select("name, company_logo_url")
          .in("name", employeeNames);
        
        // Mapear logos para documentos
        return data.map(doc => ({
          ...doc,
          company_logo_url: employeesData?.find(e => e.name === doc.employee_name)?.company_logo_url || null
        }));
      }
      
      return data;
    },
  });

  const filteredDocuments = documents?.filter((doc) =>
    doc.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.template_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-accent to-primary">
            <History className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle>Histórico de Documentos</CardTitle>
            <CardDescription>
              {documents?.length || 0} documento(s) gerado(s)
            </CardDescription>
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por funcionário ou tipo de documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredDocuments && filteredDocuments.length > 0 ? (
          <div className="space-y-3">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{doc.employee_name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {doc.template_name}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(doc.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    onClick={() => handleDownload(doc)}
                    disabled={downloadingId === doc.id}
                  >
                    {downloadingId === doc.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {searchTerm
                ? "Nenhum documento encontrado com esse critério"
                : "Nenhum documento gerado ainda"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
