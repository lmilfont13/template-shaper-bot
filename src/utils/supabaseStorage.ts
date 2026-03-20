import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves a Supabase storage path to a signed URL for private buckets.
 * If the input is already a URL (starts with http), it returns it as is.
 */
export const getStorageUrl = async (path: string | null | undefined): Promise<string | undefined> => {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, 86400); // 24 hours
      
    if (error) {
      console.error('Error creating signed URL:', error);
      // Fallback to public URL in case it's actually public
      const { data: publicData } = supabase.storage
        .from('documents')
        .getPublicUrl(path);
      return publicData.publicUrl;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Unexpected error resolving storage path:', err);
    return undefined;
  }
};

/**
 * Hook to resolve and memoize a storage URL in a component.
 */
export const useStorageUrl = (path: string | null | undefined) => {
  const [url, setUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(!!path);

  useEffect(() => {
    if (!path) {
      setUrl(undefined);
      setLoading(false);
      return;
    }

    if (path.startsWith('http')) {
      setUrl(path);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    getStorageUrl(path).then((resolvedUrl) => {
      if (isMounted) {
        setUrl(resolvedUrl);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [path]);

  return { url, loading };
};
