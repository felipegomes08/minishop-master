import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

interface StoreSettings {
  id: string;
  store_name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  whatsapp_number: string | null;
  created_at: string;
  updated_at: string;
}

export function useStoreSettings() {
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadStoreSettings() {
      setLoading(true);

      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (isMounted) {
        if (error) {
          console.error('Erro ao carregar configurações da plataforma:', error);
          setStoreSettings(null);
        } else {
          setStoreSettings(data);
        }
        setLoading(false);
      }
    }

    loadStoreSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  return { storeSettings, loading };
}
