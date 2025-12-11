import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Ticket,
  Percent,
  DollarSign,
  Loader2,
  Calendar
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_purchase: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export default function Coupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as string,
    discount_value: 0,
    min_purchase: 0,
    max_uses: '',
    valid_until: '',
    is_active: true
  });

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setCoupons(data);
    } catch (error) {
      console.error('Erro ao buscar cupons:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      min_purchase: 0,
      max_uses: '',
      valid_until: '',
      is_active: true
    });
    setEditingCoupon(null);
  };

  const openEditDialog = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_purchase: coupon.min_purchase,
      max_uses: coupon.max_uses?.toString() || '',
      valid_until: coupon.valid_until ? coupon.valid_until.split('T')[0] : '',
      is_active: coupon.is_active
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code) {
      toast({ title: 'Código é obrigatório', variant: 'destructive' });
      return;
    }

    if (formData.discount_value <= 0) {
      toast({ title: 'Valor do desconto deve ser maior que zero', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      const couponData = {
        code: formData.code.toUpperCase(),
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        min_purchase: formData.min_purchase || 0,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
        is_active: formData.is_active
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from('coupons')
          .update(couponData)
          .eq('id', editingCoupon.id);

        if (error) throw error;
        toast({ title: 'Cupom atualizado com sucesso' });
      } else {
        const { error } = await supabase
          .from('coupons')
          .insert([couponData]);

        if (error) throw error;
        toast({ title: 'Cupom criado com sucesso' });
      }

      setDialogOpen(false);
      resetForm();
      fetchCoupons();
    } catch (error: any) {
      console.error('Erro ao salvar cupom:', error);
      if (error.code === '23505') {
        toast({ title: 'Já existe um cupom com este código', variant: 'destructive' });
      } else {
        toast({ title: 'Erro ao salvar cupom', variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Cupom excluído com sucesso' });
      fetchCoupons();
    } catch (error) {
      console.error('Erro ao excluir cupom:', error);
      toast({ title: 'Erro ao excluir cupom', variant: 'destructive' });
    }
  };

  const toggleCouponActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: !isActive })
        .eq('id', id);
      if (error) throw error;
      fetchCoupons();
    } catch (error) {
      console.error('Erro ao atualizar cupom:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getCouponStatus = (coupon: Coupon) => {
    if (!coupon.is_active) return { label: 'Inativo', variant: 'secondary' as const };
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return { label: 'Expirado', variant: 'destructive' as const };
    }
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return { label: 'Esgotado', variant: 'outline' as const };
    }
    return { label: 'Ativo', variant: 'default' as const };
  };

  const filteredCoupons = coupons.filter(coupon =>
    coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coupon.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex-col sm:flex-row gap-4">
        <div>
          <h1 className="page-title">Cupons</h1>
          <p className="text-muted-foreground mt-1">Gerencie cupons de desconto</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
              <Plus className="w-4 h-4" />
              Novo Cupom
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="Ex: DESCONTO10"
                  className="uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex: 10% de desconto em toda loja"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Desconto</Label>
                  <Select 
                    value={formData.discount_type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, discount_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Valor *</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, discount_value: parseFloat(e.target.value) || 0 }))}
                      className="pl-8"
                      min="0"
                      step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {formData.discount_type === 'percentage' ? '%' : 'R$'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Compra Mínima</Label>
                  <Input
                    type="number"
                    value={formData.min_purchase}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_purchase: parseFloat(e.target.value) || 0 }))}
                    placeholder="0,00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Limite de Usos</Label>
                  <Input
                    type="number"
                    value={formData.max_uses}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_uses: e.target.value }))}
                    placeholder="Ilimitado"
                    min="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Válido até</Label>
                <Input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Cupom ativo</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-accent hover:bg-accent/90" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editingCoupon ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cupons..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Coupons Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="text-center py-16">
          <Ticket className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum cupom encontrado</h3>
          <p className="text-muted-foreground mt-1">
            {searchQuery ? 'Tente um termo de busca diferente' : 'Crie seu primeiro cupom de desconto'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCoupons.map(coupon => {
            const status = getCouponStatus(coupon);
            return (
              <div
                key={coupon.id}
                className="bg-card border border-border/50 rounded-xl p-5 hover:shadow-medium transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      {coupon.discount_type === 'percentage' ? (
                        <Percent className="w-5 h-5 text-accent" />
                      ) : (
                        <DollarSign className="w-5 h-5 text-accent" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{coupon.code}</h3>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(coupon)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir cupom?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteCoupon(coupon.id)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Desconto</span>
                    <span className="font-semibold text-success">
                      {coupon.discount_type === 'percentage' 
                        ? `${coupon.discount_value}%` 
                        : formatCurrency(coupon.discount_value)
                      }
                    </span>
                  </div>
                  
                  {coupon.min_purchase > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Compra mínima</span>
                      <span>{formatCurrency(coupon.min_purchase)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Usos</span>
                    <span>
                      {coupon.current_uses}{coupon.max_uses ? `/${coupon.max_uses}` : ' (ilimitado)'}
                    </span>
                  </div>

                  {coupon.valid_until && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Válido até</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(coupon.valid_until), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                </div>

                {coupon.description && (
                  <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border">
                    {coupon.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}