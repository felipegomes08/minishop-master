import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UserPermissionsState {
  allowedMenus: Set<string>;
  isRestricted: boolean;
  loading: boolean;
}

/**
 * Se o usuário possui qualquer linha em user_menu_permissions, ele é considerado
 * "funcionário restrito" e só vê os menus listados.
 * Caso contrário (dono original), vê todos os menus.
 */
export function useUserPermissions(): UserPermissionsState {
  const { user, loading: authLoading } = useAuth();
  const [allowedMenus, setAllowedMenus] = useState<Set<string>>(new Set());
  const [isRestricted, setIsRestricted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      if (!user) {
        setAllowedMenus(new Set());
        setIsRestricted(false);
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('user_menu_permissions')
          .select('menu_key')
          .eq('user_id', user.id);

        if (error) {
          console.error('Erro ao buscar permissões:', error);
          setAllowedMenus(new Set());
          setIsRestricted(false);
        } else if (!data || data.length === 0) {
          // Sem entradas = dono, acesso total
          setIsRestricted(false);
          setAllowedMenus(new Set());
        } else {
          const menus = new Set(data.map((r) => r.menu_key));
          menus.add('dashboard'); // sempre tem painel
          setAllowedMenus(menus);
          setIsRestricted(true);
        }
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading) fetchPermissions();
  }, [user, authLoading]);

  return { allowedMenus, isRestricted, loading: authLoading || loading };
}
