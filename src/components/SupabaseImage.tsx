import { useState, useEffect } from "react";
import { fetchAndResolveImage } from "@/utils/supabaseStorage";
import { Loader2, Image as ImageIcon } from "lucide-react";

interface SupabaseImageProps {
    path: string | null | undefined;
    alt: string;
    className?: string;
    fallback?: React.ReactNode;
}

export const SupabaseImage = ({ path, alt, className, fallback }: SupabaseImageProps) => {
    const [url, setUrl] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        let currentUrl: string | undefined = undefined;

        const loadImage = async () => {
            if (!path) {
                setUrl(undefined);
                return;
            }

            setLoading(true);
            setError(false);
            try {
                const resolved = await fetchAndResolveImage(path);
                if (resolved) {
                    setUrl(resolved);
                    currentUrl = resolved;
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error("Erro ao carregar imagem do Supabase:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        loadImage();

        return () => {
            // Importante: revogar a URL do blob para evitar vazamento de memória
            if (currentUrl && currentUrl.startsWith('blob:')) {
                URL.revokeObjectURL(currentUrl);
            }
        };
    }, [path]);

    if (loading) {
        return (
            <div className={`flex items-center justify-center bg-muted/20 animate-pulse rounded ${className}`}>
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !url) {
        return fallback || (
            <div className={`flex items-center justify-center bg-muted/10 rounded border border-dashed ${className}`}>
                <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
            </div>
        );
    }

    return <img src={url} alt={alt} className={className} />;
};
