import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves a Supabase storage path to a public URL.
 * If the input is already a URL (starts with http), it returns it as is.
 */
export const getStorageUrl = (path: string | null | undefined): string | undefined => {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  
  const { data } = supabase.storage
    .from('documents')
    .getPublicUrl(path);
    
  return data.publicUrl;
};
