import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Trash2, Users as UsersIcon, Crown, Loader2, AlertCircle } from 'lucide-react';
import { MENU_KEYS, getUserLimitForPlan } from '@/lib/planLimits';

const NEW_MENU_KEYS = ['expenses', 'financial', 'users'];

interface CompanyUserRow {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email?: string | null;
  name?: string | null;
  is_owner: boolean;
  menu_keys: string[];
}

export default function Users() {
  const { user } = useAuth();
  const { companyId, loading: companyLoading } = useCompanyContext();
  const { planTier, loading: subLoading } = useSubscription();

  const [users, setUsers] = useState<CompanyUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CompanyUserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    menus: new Set<string>(['dashboard']),
  });

  const limit = getUserLimitForPlan(planTier);
  const used = users.length;
  const canAdd = used < limit;

  useEffect(() => {
    if (companyId) fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function fetchUsers() {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data: members, error } = await supabase
        .from('company_users')
        .select('id, user_id, role, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const userIds = (members ?? []).map((m) => m.user_id);
      const { data: perms } = await supabase
        .from('user_menu_permissions')
        .select('user_id, menu_key')
        .in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']);

      const permMap = new Map<string, string[]>();
      (perms ?? []).forEach((p) => {
        const arr = permMap.get(p.user_id) ?? [];
        arr.push(p.menu_key);
        permMap.set(p.user_id, arr);
      });

      const rows: CompanyUserRow[] = (members ?? []).map((m) => {
        const mk = permMap.get(m.user_id) ?? [];
        return {
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          created_at: m.created_at,
          is_owner: mk.length === 0, // sem entradas = dono
          menu_keys: mk,
        };
      });
      setUsers(rows);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      email: '',
      password: '',
      menus: new Set<string>(['dashboard']),
    });
  }

  function toggleMenu(key: string, checked: boolean) {
    const next = new Set(formData.menus);
    if (checked) next.add(key);
    else next.delete(key);
    next.add('dashboard'); // sempre
    setFormData({ ...formData, menus: next });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.password) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (formData.password.length < 8) {
      toast.error('Senha deve ter no mínimo 8 caracteres');
      return;
    }
    if (!canAdd) {
      toast.error('Limite de usuários do plano atingido');
      return;
    }
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const { data, error } = await supabase.functions.invoke('create-company-user', {
        body: {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          menu_keys: Array.from(formData.menus),
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Usuário criado com sucesso');
      setDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao criar usuário');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const { data, error } = await supabase.functions.invoke('delete-company-user', {
        body: { target_user_id: deleteTarget.user_id },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Usuário removido');
      setDeleteTarget(null);
      fetchUsers();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao remover usuário');
    } finally {
      setDeleting(false);
    }
  }

  if (companyLoading || subLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Usuários</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os funcionários que acessam seu painel
          </p>
        </div>
        <Button
          onClick={() => { resetForm(); setDialogOpen(true); }}
          disabled={!canAdd}
          title={!canAdd ? `Limite do plano ${planTier ?? ''} atingido` : ''}
        >
          <Plus className="w-4 h-4 mr-2" /> Adicionar usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Plano {planTier ? planTier.charAt(0).toUpperCase() + planTier.slice(1) : '—'}
          </CardTitle>
          <CardDescription>
            {used} de {limit} usuário{limit > 1 ? 's' : ''} utilizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
            />
          </div>
          {!canAdd && (
            <p className="text-sm text-amber-600 mt-3">
              Você atingiu o limite do seu plano. Faça upgrade para adicionar mais usuários.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5" /> Membros da empresa
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum usuário cadastrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Menus permitidos</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {u.user_id.slice(0, 8)}…
                      </code>
                      {u.user_id === user?.id && (
                        <Badge variant="secondary" className="ml-2">Você</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.is_owner ? (
                        <Badge className="bg-amber-500">Proprietário</Badge>
                      ) : (
                        <Badge variant="outline">Funcionário</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.is_owner ? (
                        <span className="text-sm text-muted-foreground">Todos</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.menu_keys.map((mk) => {
                            const m = MENU_KEYS.find((x) => x.key === mk);
                            return (
                              <Badge key={mk} variant="secondary" className="text-xs">
                                {m?.label ?? mk}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      {!u.is_owner && u.user_id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(u)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog criar */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar usuário</DialogTitle>
            <DialogDescription>
              Crie um acesso para um funcionário e escolha quais telas ele poderá ver.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha * (mín. 8 caracteres)</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Telas permitidas</Label>
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg">
                {MENU_KEYS.map((m) => {
                  const checked = formData.menus.has(m.key);
                  const disabled = m.alwaysOn;
                  return (
                    <label
                      key={m.key}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={(v) => toggleMenu(m.key, !!v)}
                      />
                      <span className={disabled ? 'text-muted-foreground' : ''}>
                        {m.label}{disabled && ' (sempre)'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando…</> : 'Criar usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog excluir */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              O acesso será encerrado imediatamente. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Removendo…' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
