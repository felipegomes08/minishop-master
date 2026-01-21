import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useSuperAdminCheck() {
  const { user, loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSuperAdmin() {
      if (!user) {
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('is_super_admin', {
          _user_id: user.id
        });

        if (error) {
          console.error('Erro ao verificar super admin:', error);
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(data === true);
        }
      } catch (err) {
        console.error('Exceção ao verificar super admin:', err);
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      checkSuperAdmin();
    }
  }, [user, authLoading]);

  return { isSuperAdmin, loading: authLoading || loading };
}
