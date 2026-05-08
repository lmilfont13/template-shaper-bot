import { supabase } from "@/integrations/supabase/client";

/**
 * Converte um caminho de armazenamento do Supabase (bucket 'documents') em uma URL pública utilizável.
 * Se o caminho já for uma URL (começar com http), retorna como está.
 */
export const getStorageUrl = (path: string | null | undefined): string | undefined => {
    if (!path) return undefined;

    // Se for uma URL completa, retorna sem alteração
    if (path.startsWith('http')) return path;

    // Caso contrário, gera a URL pública do bucket 'documents'
    const { data } = supabase.storage.from('documents').getPublicUrl(path);
    return data.publicUrl;
};

/**
 * Busca uma imagem do Supabase (bucket 'documents') e a resolve como uma URL de Blob.
 * Útil para contornar problemas de bucket privado ou CORS, usando o cliente autenticado.
 */
export const fetchAndResolveImage = async (path: string | null | undefined): Promise<string | undefined> => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;

    try {
        const { data, error } = await supabase.storage.from('documents').download(path);
        if (error) throw error;
        if (!data) return undefined;

        return URL.createObjectURL(data);
    } catch (error) {
        console.error('Erro ao resolver imagem do Supabase:', error);
        return undefined;
    }
};
