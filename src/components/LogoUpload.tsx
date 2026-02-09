import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Upload, Loader2, X, Image } from "lucide-react";

interface LogoUploadProps {
  currentLogoUrl?: string;
  onLogoUploaded: (url: string) => void;
  onLogoRemoved: () => void;
}

export const LogoUpload = ({ currentLogoUrl, onLogoUploaded, onLogoRemoved }: LogoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentLogoUrl || "");

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione uma imagem (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A logo deve ter no máximo 2MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Fazer upload
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Use signed URL for private bucket
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 86400); // 24 hours

      if (signedUrlError) throw signedUrlError;

      const signedUrl = signedUrlData.signedUrl;
      setPreviewUrl(signedUrl);
      onLogoUploaded(filePath); // Store the path, not the URL

      toast({
        title: "Logo enviada!",
        description: "A logo foi carregada com sucesso.",
      });
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setPreviewUrl("");
    onLogoRemoved();
    toast({
      title: "Logo removida",
      description: "A logo foi removida do cadastro.",
    });
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="logo-upload">Logo da Empresa</Label>
      
      {previewUrl ? (
        <div className="relative w-full max-w-xs">
          <div className="border-2 border-dashed rounded-lg p-4 bg-muted/50">
            <img 
              src={previewUrl} 
              alt="Logo da empresa" 
              className="max-h-32 mx-auto object-contain"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2"
            onClick={handleRemoveLogo}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-6 bg-muted/50 hover:bg-muted/70 transition-colors">
          <Input
            id="logo-upload"
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
          <Label
            htmlFor="logo-upload"
            className="flex flex-col items-center justify-center cursor-pointer space-y-2"
          >
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Enviando...</span>
              </>
            ) : (
              <>
                <Image className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Clique para enviar a logo
                </span>
                <span className="text-xs text-muted-foreground">
                  PNG, JPG (máx. 2MB)
                </span>
              </>
            )}
          </Label>
        </div>
      )}
    </div>
  );
};
