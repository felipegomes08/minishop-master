import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useAdminCheck() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (error || data !== true) {
          if (error) console.error('Erro ao verificar admin:', error);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // Validar se empresa está ativa
        const { data: companyId } = await supabase.rpc('get_user_company_id', {
          _user_id: user.id,
        });

        if (!companyId) {
          setIsAdmin(false);
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        const { data: companyData } = await supabase
          .from('companies')
          .select('is_active')
          .eq('id', companyId)
          .maybeSingle();

        if (!companyData?.is_active) {
          setIsAdmin(false);
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        setIsAdmin(true);
      } catch (err) {
        console.error('Exceção ao verificar admin:', err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      checkAdmin();
    }
  }, [user, authLoading]);

  return { isAdmin, loading: authLoading || loading };
}
