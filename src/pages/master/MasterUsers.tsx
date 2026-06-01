import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Plus, Search, Shield, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface AuthUser {
  id: string;
  email: string | null;
}

interface CompanyUser {
  id: string;
  company_id: string;
  user_id: string;
  email?: string | null;
  role: string;
  created_at: string;
  company?: Company;
}

interface MasterAdmin {
  id: string;
  user_id: string;
  email?: string | null;
  role: string;
  created_at: string;
}

export default function MasterUsers() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [masterAdmins, setMasterAdmins] = useState<MasterAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'company_user' | 'master_admin'>('company_user');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'company_user' | 'master_admin' } | null>(null);

  const [formData, setFormData] = useState({
    user_id: '',
    company_id: '',
    role: 'admin' as 'admin' | 'user'
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch companies
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name, slug')
        .order('name');

      setCompanies(companiesData || []);

      // Fetch company users
      const { data: companyUsersData } = await supabase
        .from('company_users')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch master admins
      const { data: masterAdminsData } = await supabase
        .from('master_admins')
        .select('*')
        .order('created_at', { ascending: false });

      const allUserIds = Array.from(
        new Set([
          ...(companyUsersData?.map((cu: any) => cu.user_id) || []),
          ...(masterAdminsData?.map((ma: any) => ma.user_id) || []),
        ]),
      );

      let userEmails: Record<string, string | null> = {};
      if (allUserIds.length > 0) {
        // Use safe RPC that runs as SECURITY DEFINER to fetch emails from auth.users
        // This requires the DB migration/function `get_user_emails(uuid[])` to exist.
        try {
          const { data: authUsers, error: rpcErr } = await supabase.rpc('get_user_emails_superadmin', { user_ids: allUserIds });
          if (rpcErr) {
            console.warn('RPC get_user_emails returned error:', rpcErr);
          }
          if (authUsers && Array.isArray(authUsers)) {
            userEmails = (authUsers as Array<any>).reduce((acc: Record<string, string | null>, u: any) => {
              acc[u.user_id ?? u.id] = u.email;
              return acc;
            }, {});
          }
        } catch (e) {
          console.warn('Erro ao chamar RPC get_user_emails:', e);
        }
      }

      // Add company info and email to each user
      const usersWithCompany = (companyUsersData || []).map((cu: any) => ({
        ...cu,
        email: userEmails[cu.user_id] ?? null,
        company: companiesData?.find(c => c.id === cu.company_id),
      }));

      setCompanyUsers(usersWithCompany);
      setMasterAdmins(
        (masterAdminsData || []).map((ma: any) => ({
          ...ma,
          email: userEmails[ma.user_id] ?? null,
        })),
      );
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      user_id: '',
      company_id: '',
      role: 'admin'
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.user_id.trim()) {
      toast.error('ID do usuário é obrigatório');
      return;
    }

    if (dialogType === 'company_user' && !formData.company_id) {
      toast.error('Empresa é obrigatória');
      return;
    }

    setSaving(true);
    try {
      if (dialogType === 'master_admin') {
        const { error } = await supabase
          .from('master_admins')
          .insert({
            user_id: formData.user_id.trim(),
            role: 'super_admin'
          });

        if (error) throw error;
        toast.success('Super admin adicionado!');
      } else {
        const { error } = await supabase
          .from('company_users')
          .insert({
            user_id: formData.user_id.trim(),
            company_id: formData.company_id,
            role: formData.role
          });

        if (error) throw error;
        toast.success('Usuário vinculado à empresa!');
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      if (error.code === '23505') {
        toast.error('Este usuário já está vinculado');
      } else if (error.code === '23503') {
        toast.error('Usuário não encontrado');
      } else {
        toast.error('Erro ao salvar');
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem() {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'master_admin') {
        const { error } = await supabase
          .from('master_admins')
          .delete()
          .eq('id', itemToDelete.id);

        if (error) throw error;
        toast.success('Super admin removido');
      } else {
        const { error } = await supabase
          .from('company_users')
          .delete()
          .eq('id', itemToDelete.id);

        if (error) throw error;
        toast.success('Vínculo removido');
      }

      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Usuários</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie super admins e vínculos de usuários com empresas
        </p>
      </div>

      {/* Super Admins Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              Super Administradores
            </CardTitle>
            <CardDescription>
              Usuários com acesso total à plataforma
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setDialogType('master_admin');
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array(2).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </div>
          ) : masterAdmins.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhum super admin cadastrado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Adicionado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {masterAdmins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {admin.user_id}
                      </code>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground">
                        {admin.email ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-amber-500">
                        {admin.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(admin.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setItemToDelete({ id: admin.id, type: 'master_admin' });
                          setDeleteDialogOpen(true);
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Company Users Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Usuários de Empresas
            </CardTitle>
            <CardDescription>
              Vínculos entre usuários e empresas
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setDialogType('company_user');
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Vincular
          </Button>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative max-w-md mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por empresa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : companyUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum vínculo cadastrado
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Vinculado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyUsers
                  .filter(cu => 
                    cu.company?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    cu.user_id.includes(searchQuery) ||
                    cu.email?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((cu) => (
                    <TableRow key={cu.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{cu.company?.name || 'Empresa desconhecida'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {cu.user_id.slice(0, 8)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-foreground">
                          {cu.email ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cu.role === 'admin' ? 'default' : 'secondary'}>
                          {cu.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(cu.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setItemToDelete({ id: cu.id, type: 'company_user' });
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'master_admin' ? 'Adicionar Super Admin' : 'Vincular Usuário'}
            </DialogTitle>
            <DialogDescription>
              {dialogType === 'master_admin'
                ? 'Adicione um usuário como super administrador da plataforma'
                : 'Vincule um usuário a uma empresa'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user_id">ID do Usuário *</Label>
              <Input
                id="user_id"
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                placeholder="UUID do usuário"
                required
              />
              <p className="text-xs text-muted-foreground">
                O ID pode ser encontrado na tabela auth.users do Supabase
              </p>
            </div>

            {dialogType === 'company_user' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="company_id">Empresa *</Label>
                  <Select
                    value={formData.company_id}
                    onValueChange={(value) => setFormData({ ...formData, company_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Papel</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: 'admin' | 'user') => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">Usuário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : dialogType === 'master_admin' ? 'Adicionar' : 'Vincular'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção?</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete?.type === 'master_admin'
                ? 'O usuário perderá acesso de super admin à plataforma.'
                : 'O usuário perderá acesso à empresa.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
