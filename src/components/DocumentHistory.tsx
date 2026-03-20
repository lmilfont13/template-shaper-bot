import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, Search, Download, Calendar, FileText, Loader2, Trash2, Share2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { generatePDFFromTemplate } from "@/utils/pdfFromTemplate";
import { exportToCSV } from "@/utils/exportUtils";

export const DocumentHistory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleDownload = async (doc: any) => {
    try {
      setDownloadingId(doc.id);

      // Buscar coligada para pegar as imagens e endereço
      let coligadaData = null;
      if (doc.coligada_id) {
        const { data: coligada } = await supabase
          .from('coligadas')
          .select('company_logo_url, signature_url, stamp_url, endereco')
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
        coligada_endereco: coligadaData?.endereco || doc.data?.coligada_endereco,
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

  const handleWhatsAppShare = async (doc: any) => {
    try {
      setDownloadingId(doc.id);

      // Buscar coligada para pegar as imagens e endereço
      let coligadaData = null;
      if (doc.coligada_id) {
        const { data: coligada } = await supabase
          .from('coligadas')
          .select('company_logo_url, signature_url, stamp_url, endereco')
          .eq('id', doc.coligada_id)
          .maybeSingle();
        coligadaData = coligada;
      }

      const processedText = doc.data?.processedText || '';

      // Gerar PDF como Blob
      const pdfBlob = await generatePDFFromTemplate({
        employee_name: doc.employee_name,
        template_name: doc.template_name,
        processedText: processedText,
        company_logo_url: coligadaData?.company_logo_url || doc.data?.company_logo_url,
        signature_url: coligadaData?.signature_url || doc.data?.signature_url,
        stamp_url: coligadaData?.stamp_url || doc.data?.stamp_url,
        coligada_endereco: coligadaData?.endereco || doc.data?.coligada_endereco,
        created_at: doc.created_at,
      }, true) as Blob;

      const fileName = `${doc.employee_name.replace(/\s+/g, '_')}_${doc.template_name.replace(/\s+/g, '_')}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Verificar se o navegador suporta Web Share API
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Documento Tarhget',
          text: `Documento de ${doc.employee_name} - ${doc.template_name}`,
          files: [file]
        });

        toast({
          title: "Compartilhamento iniciado!",
          description: "Escolha o WhatsApp para compartilhar o documento.",
        });
      } else {
        // Fallback: fazer download do arquivo
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Download iniciado!",
          description: "Compartilhe o arquivo manualmente pelo WhatsApp.",
        });
      }
    } catch (error: any) {
      console.error('Erro ao compartilhar:', error);
      toast({
        title: "Erro ao compartilhar",
        description: error.message || "Não foi possível compartilhar o documento.",
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
    <Card className="glass-card premium-shadow border-none overflow-hidden animate-in fade-in duration-500">
      <CardHeader className="bg-gradient-to-r from-accent/10 to-transparent border-b border-accent/10 pb-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-accent shadow-lg shadow-accent/20 transform transition-transform hover:rotate-12 duration-300">
              <History className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">Histórico de Documentos</CardTitle>
              <CardDescription className="text-base text-muted-foreground/80">
                Gerenciando {documents?.length || 0} arquivos processados no sistema
              </CardDescription>
            </div>
          </div>
          <div className="flex-1 md:flex md:justify-end">
            {documents && documents.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="glass-card hover:bg-accent/10 hover:text-accent transition-all duration-300 rounded-lg px-4 h-10"
                onClick={() => {
                  const columns = [
                    { key: 'employee_name', label: 'Funcionário' },
                    { key: 'template_name', label: 'Tipo de Documento' },
                    { key: 'coligada_name', label: 'Coligada' },
                    { key: 'created_at', label: 'Data de Criação' },
                  ];
                  
                  const formattedData = documents.map(doc => ({
                    ...doc,
                    created_at: format(new Date(doc.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                  }));
                  
                  exportToCSV(formattedData, 'historico_documentos', columns);
                  
                  toast({
                    title: "Exportação concluída!",
                    description: "O histórico foi exportado com sucesso.",
                  });
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            )}
          </div>
        </div>
        <div className="relative mt-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-all duration-300 group-focus-within:text-primary" />
          <Input
            placeholder="Buscar por funcionário, empresa ou tipo de documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-14 glass-card focus:ring-accent/50 text-base rounded-2xl"
          />
        </div>
      </CardHeader>
      <CardContent className="p-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredDocuments && filteredDocuments.length > 0 ? (
          <div className="space-y-3">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="p-6 rounded-2xl glass-card hover:premium-shadow hover-lift border-transparent hover:border-accent/10 transition-all duration-300 group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-start gap-5 flex-1">
                    <div className="p-3 rounded-xl bg-accent/5 group-hover:bg-accent/10 transition-colors shadow-inner">
                      <FileText className="h-6 w-6 text-accent" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors">{doc.employee_name}</h4>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-[10px] uppercase tracking-widest border-accent/20 text-accent font-bold px-3">
                            {doc.template_name}
                          </Badge>
                          {doc.coligada_name && (
                            <Badge variant="secondary" className="text-[10px] uppercase tracking-widest bg-secondary/10 text-secondary-foreground font-bold px-3">
                              {doc.coligada_name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(doc.created_at), "dd 'de' MMMM, yyyy '•' HH:mm", {
                            locale: ptBR,
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="glass-card hover:bg-primary hover:text-primary-foreground hover:premium-shadow transition-all duration-300 rounded-xl h-11 px-6 min-w-[120px]"
                      onClick={() => handleDownload(doc)}
                      disabled={downloadingId === doc.id}
                    >
                      {downloadingId === doc.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="glass-card text-green-600 hover:bg-green-600 hover:text-white transition-all duration-300 rounded-xl h-11 px-6"
                      onClick={() => handleWhatsAppShare(doc)}
                      disabled={downloadingId === doc.id}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDocument.mutate(doc.id)}
                      className="hover:bg-destructive/10 hover:text-destructive rounded-xl h-11 w-11 p-0 transition-all duration-300"
                    >
                      <Trash2 className="h-5 w-5" />
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
