import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  whatsapp_number: string | null;
  is_active: boolean;
}

export function useCompanyContext() {
  const { user, loading: authLoading } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCompanyContext() {
      if (!user) {
        setCompany(null);
        setCompanyId(null);
        setLoading(false);
        return;
      }

      try {
        // First get the user's company_id
        const { data: companyIdData, error: companyIdError } = await supabase.rpc('get_user_company_id', {
          _user_id: user.id
        });

        if (companyIdError) {
          console.error('Erro ao buscar company_id:', companyIdError);
          setCompany(null);
          setCompanyId(null);
          setLoading(false);
          return;
        }

        if (!companyIdData) {
          // User has no company assigned
          setCompany(null);
          setCompanyId(null);
          setLoading(false);
          return;
        }

        setCompanyId(companyIdData);

        // Now fetch the company details
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyIdData)
          .single();

        if (companyError) {
          console.error('Erro ao buscar empresa:', companyError);
          setCompany(null);
        } else {
          setCompany(companyData);
        }
      } catch (err) {
        console.error('Exceção ao buscar contexto de empresa:', err);
        setCompany(null);
        setCompanyId(null);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchCompanyContext();
    }
  }, [user, authLoading]);

  return { company, companyId, loading: authLoading || loading };
}
