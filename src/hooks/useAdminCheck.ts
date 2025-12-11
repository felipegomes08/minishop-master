import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useAdminCheck() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAdminRole = useCallback(async (userId: string, retryCount = 0): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin'
      });

      if (error) {
        console.error('Error checking admin role (attempt ' + (retryCount + 1) + '):', error);
        if (retryCount < 3) {
          await new Promise(resolve => setTimeout(resolve, 300 * (retryCount + 1)));
          return checkAdminRole(userId, retryCount + 1);
        }
        return false;
      }

      return data === true;
    } catch (err) {
      console.error('Exception checking admin role (attempt ' + (retryCount + 1) + '):', err);
      if (retryCount < 3) {
        await new Promise(resolve => setTimeout(resolve, 300 * (retryCount + 1)));
        return checkAdminRole(userId, retryCount + 1);
      }
      return false;
    }
  }, []);

  useEffect(() => {
    async function performCheck() {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(null);
      setLoading(true);
      
      // Small delay to ensure auth token is fully propagated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await checkAdminRole(user.id);
      setIsAdmin(result);
      setLoading(false);
    }

    if (!authLoading) {
      performCheck();
    }
  }, [user, authLoading, checkAdminRole]);

  return { isAdmin, loading: authLoading || loading };
}
