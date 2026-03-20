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
      <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-xl font-bold">Histórico</CardTitle>
              <CardDescription className="text-sm">
                Documentos processados
              </CardDescription>
            </div>
          </div>
          <div className="flex-1 md:flex md:justify-end">
            {documents && documents.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="glass-card h-9 px-4 font-bold"
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
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 glass-card"
          />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredDocuments && filteredDocuments.length > 0 ? (
          <div className="space-y-3">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-xl glass-card transition-all duration-300 group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold group-hover:text-primary transition-colors truncate">{doc.employee_name}</h4>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="text-[9px] uppercase tracking-wider border-accent/20 text-accent font-bold px-2 py-0">
                            {doc.template_name}
                          </Badge>
                          {doc.coligada_name && (
                            <Badge variant="secondary" className="text-[9px] uppercase tracking-wider bg-secondary/10 text-secondary-foreground font-bold px-2 py-0">
                              {doc.coligada_name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span className="truncate">
                            {format(new Date(doc.created_at), "dd 'de' MMMM, yyyy '•' HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full lg:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 lg:flex-none glass-card h-10 px-4 min-w-[100px]"
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
                          <span className="whitespace-nowrap">PDF</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 lg:flex-none glass-card text-green-600 h-10 px-4"
                      onClick={() => handleWhatsAppShare(doc)}
                      disabled={downloadingId === doc.id}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      <span className="whitespace-nowrap">ZIP / Zap</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDocument.mutate(doc.id)}
                      className="hover:bg-destructive/10 hover:text-destructive h-9 w-9 p-0"
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
