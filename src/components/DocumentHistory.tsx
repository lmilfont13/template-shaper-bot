import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, Search, Download, Calendar, FileText, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { generatePDFFromTemplate } from "@/utils/pdfFromTemplate";

export const DocumentHistory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleDownload = async (doc: any) => {
    try {
      setDownloadingId(doc.id);

      // Buscar coligada para pegar as imagens
      let coligadaData = null;
      if (doc.coligada_id) {
        const { data: coligada } = await supabase
          .from('coligadas')
          .select('company_logo_url, signature_url, stamp_url')
          .eq('id', doc.coligada_id)
          .maybeSingle();
        coligadaData = coligada;
      }

      // Usar o texto processado que já está no documento
      const processedText = doc.data?.processedText || '';

      // Gerar PDF com o conteúdo do template
      await generatePDFFromTemplate({
        employee_name: doc.employee_name,
        template_name: doc.template_name,
        processedText: processedText,
        company_logo_url: coligadaData?.company_logo_url || doc.data?.company_logo_url,
        signature_url: coligadaData?.signature_url || doc.data?.signature_url,
        stamp_url: coligadaData?.stamp_url || doc.data?.stamp_url,
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
      return data;
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("generated_documents")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Documento removido",
        description: "O documento foi excluído do histórico.",
      });
      queryClient.invalidateQueries({ queryKey: ["generated-documents"] });
    },
  });

  const filteredDocuments = documents?.filter((doc) =>
    doc.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.coligada_name && doc.coligada_name.toLowerCase().includes(searchTerm.toLowerCase()))
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">{doc.employee_name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {doc.template_name}
                        </Badge>
                        {doc.coligada_name && (
                          <Badge variant="secondary" className="text-xs">
                            {doc.coligada_name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(doc.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
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
                          Download
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDocument.mutate(doc.id)}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
