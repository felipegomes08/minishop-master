import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Building2, ExternalLink, Users, Crown, Info } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type PlanTier = 'bronze' | 'prata' | 'ouro' | null;

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  whatsapp_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  plan_tier: PlanTier;
  plan_status: string | null;
  plan_source: 'stripe' | 'manual' | null;
  subscription_end: string | null;
}

interface CompanyStats {
  products: number;
  sales: number;
  customers: number;
}

const PLAN_LABELS: Record<string, string> = {
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  trialing: 'Período de teste',
  past_due: 'Vencido',
  canceled: 'Cancelado',
  manual: 'Manual',
  incomplete: 'Incompleto',
};

function PlanBadge({ tier }: { tier: PlanTier }) {
  if (!tier) {
    return <Badge variant="destructive">Sem plano</Badge>;
  }
  const styles: Record<string, string> = {
    bronze: 'bg-orange-700/20 text-orange-700 border-orange-700/30 hover:bg-orange-700/20',
    prata: 'bg-slate-400/20 text-slate-600 border-slate-400/30 hover:bg-slate-400/20',
    ouro: 'bg-amber-500/20 text-amber-700 border-amber-500/40 hover:bg-amber-500/20',
  };
  return (
    <Badge variant="outline" className={styles[tier]}>
      {tier === 'ouro' && <Crown className="h-3 w-3 mr-1" />}
      {PLAN_LABELS[tier]}
    </Badge>
  );
}

export default function MasterCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyStats, setCompanyStats] = useState<Record<string, CompanyStats>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    whatsapp_number: '',
    primary_color: '#4F46E5',
    secondary_color: '#F59E0B',
    is_active: true,
    plan_tier: 'none' as 'none' | 'bronze' | 'prata' | 'ouro',
    subscription_end: '',
  });
  useEffect(() => {
    fetchCompanies();
  }, []);

  async function fetchCompanies() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies((data || []) as unknown as Company[]);

      // Fetch stats for each company
      const stats: Record<string, CompanyStats> = {};
      for (const company of data || []) {
        const [productsRes, salesRes, customersRes] = await Promise.all([
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
          supabase.from('sales').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
          supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', company.id)
        ]);
        
        stats[company.id] = {
          products: productsRes.count || 0,
          sales: salesRes.count || 0,
          customers: customersRes.count || 0
        };
      }
      setCompanyStats(stats);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
      toast.error('Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  }

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function resetForm() {
    setFormData({
      name: '',
      slug: '',
      whatsapp_number: '',
      primary_color: '#4F46E5',
      secondary_color: '#F59E0B',
      is_active: true,
      plan_tier: 'none',
      subscription_end: '',
    });
    setEditingCompany(null);
  }

  function openEditDialog(company: Company) {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      slug: company.slug,
      whatsapp_number: company.whatsapp_number || '',
      primary_color: company.primary_color || '#4F46E5',
      secondary_color: company.secondary_color || '#F59E0B',
      is_active: company.is_active,
      plan_tier: (company.plan_tier as any) || 'none',
      subscription_end: company.subscription_end ? company.subscription_end.split('T')[0] : '',
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) {
      toast.error('Nome e slug são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const planTier = formData.plan_tier === 'none' ? null : formData.plan_tier;
      const isStripeManaged = editingCompany?.plan_source === 'stripe';
      const planChanged = editingCompany?.plan_tier !== planTier;

      const companyData: any = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        whatsapp_number: formData.whatsapp_number.trim() || null,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        is_active: formData.is_active,
      };

      // Update plan fields when not Stripe-managed, or when admin explicitly changes the plan
      if (!isStripeManaged || planChanged) {
        companyData.plan_tier = planTier;
        companyData.plan_source = planTier ? 'manual' : null;
        companyData.plan_status = planTier ? 'manual' : null;
        companyData.subscription_end = formData.subscription_end
          ? new Date(formData.subscription_end).toISOString()
          : null;
      }

      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update(companyData)
          .eq('id', editingCompany.id);

        if (error) throw error;
        toast.success('Empresa atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('companies')
          .insert(companyData);

        if (error) throw error;
        toast.success('Empresa criada com sucesso!');
      }

      setDialogOpen(false);
      resetForm();
      fetchCompanies();
    } catch (error: any) {
      console.error('Erro ao salvar empresa:', error);
      if (error.code === '23505') {
        toast.error('Já existe uma empresa com este slug');
      } else {
        toast.error('Erro ao salvar empresa');
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleCompanyActive(company: Company) {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ is_active: !company.is_active })
        .eq('id', company.id);

      if (error) throw error;
      toast.success(company.is_active ? 'Empresa desativada' : 'Empresa ativada');
      fetchCompanies();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status da empresa');
    }
  }

  async function deleteCompany() {
    if (!companyToDelete) return;

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyToDelete);

      if (error) throw error;
      toast.success('Empresa excluída com sucesso!');
      setDeleteDialogOpen(false);
      setCompanyToDelete(null);
      fetchCompanies();
    } catch (error) {
      console.error('Erro ao excluir empresa:', error);
      toast.error('Erro ao excluir empresa');
    }
  }

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch =
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan =
      planFilter === 'all' ||
      (planFilter === 'none' ? !company.plan_tier : company.plan_tier === planFilter);
    return matchesSearch && matchesPlan;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Empresas</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todas as empresas cadastradas na plataforma
          </p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Empresa
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empresas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os planos</SelectItem>
            <SelectItem value="ouro">Ouro</SelectItem>
            <SelectItem value="prata">Prata</SelectItem>
            <SelectItem value="bronze">Bronze</SelectItem>
            <SelectItem value="none">Sem plano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Companies Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg">Nenhuma empresa encontrada</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery ? 'Tente uma busca diferente' : 'Clique em "Nova Empresa" para começar'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status do plano</TableHead>
                  <TableHead className="text-center">Produtos</TableHead>
                  <TableHead className="text-center">Vendas</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {company.logo_url ? (
                          <img
                            src={company.logo_url}
                            alt={company.name}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div
                            className="h-10 w-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: company.primary_color || '#4F46E5' }}
                          >
                            <Building2 className="h-5 w-5 text-white" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(company.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{company.slug}</code>
                    </TableCell>
                    <TableCell className="text-center">
                      {companyStats[company.id]?.products || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      {companyStats[company.id]?.sales || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      {companyStats[company.id]?.customers || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={company.is_active ? 'default' : 'secondary'}>
                        {company.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(`/catalogo/${company.slug}`, '_blank')}
                          title="Ver catálogo"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(company)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setCompanyToDelete(company.id);
                            setDeleteDialogOpen(true);
                          }}
                          title="Excluir"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
            </DialogTitle>
            <DialogDescription>
              {editingCompany ? 'Atualize os dados da empresa' : 'Preencha os dados para criar uma nova empresa'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Empresa *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    name: e.target.value,
                    slug: editingCompany ? formData.slug : generateSlug(e.target.value)
                  });
                }}
                placeholder="Ex: Minha Loja"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL) *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: generateSlug(e.target.value) })}
                placeholder="minha-loja"
                required
              />
              <p className="text-xs text-muted-foreground">
                URL: /catalogo/{formData.slug || 'slug'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp_number}
                onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                placeholder="5511999999999"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Cor Primária</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="primary_color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary_color">Cor Secundária</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="secondary_color"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Empresa Ativa</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : editingCompany ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os dados associados a esta empresa
              (produtos, vendas, clientes, etc.) serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteCompany}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
