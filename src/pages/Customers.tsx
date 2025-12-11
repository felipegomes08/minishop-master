import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Users,
  Phone,
  MapPin,
  Loader2,
  Ticket,
  X
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
}

interface CustomerCoupon {
  id: string;
  coupon_id: string;
  coupons: Coupon;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [customerCouponsMap, setCustomerCouponsMap] = useState<Record<string, CustomerCoupon[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedCouponToAdd, setSelectedCouponToAdd] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [customersRes, couponsRes, customerCouponsRes] = await Promise.all([
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('coupons').select('*').eq('is_active', true),
        supabase.from('customer_coupons').select('*, coupons(*)')
      ]);

      if (customersRes.data) setCustomers(customersRes.data);
      if (couponsRes.data) setCoupons(couponsRes.data);
      
      // Agrupar cupons por cliente
      if (customerCouponsRes.data) {
        const map: Record<string, CustomerCoupon[]> = {};
        customerCouponsRes.data.forEach((cc: any) => {
          if (!map[cc.customer_id]) map[cc.customer_id] = [];
          map[cc.customer_id].push(cc);
        });
        setCustomerCouponsMap(map);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', phone: '', address: '', notes: '' });
    setEditingCustomer(null);
    setSelectedCouponToAdd('');
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      address: customer.address || '',
      notes: customer.notes || ''
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      const customerData = {
        name: formData.name,
        phone: formData.phone || null,
        address: formData.address || null,
        notes: formData.notes || null
      };

      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', editingCustomer.id);

        if (error) throw error;
        toast({ title: 'Cliente atualizado com sucesso' });
      } else {
        const { error } = await supabase
          .from('customers')
          .insert([customerData]);

        if (error) throw error;
        toast({ title: 'Cliente criado com sucesso' });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      toast({ title: 'Erro ao salvar cliente', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Cliente excluído com sucesso' });
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      toast({ title: 'Erro ao excluir cliente', variant: 'destructive' });
    }
  };

  const addCouponToCustomer = async (customerId: string, couponId: string) => {
    try {
      const { error } = await supabase
        .from('customer_coupons')
        .insert([{ customer_id: customerId, coupon_id: couponId }]);

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Cupom já vinculado a este cliente', variant: 'destructive' });
        } else {
          throw error;
        }
        return;
      }
      
      toast({ title: 'Cupom adicionado ao cliente' });
      setSelectedCouponToAdd('');
      fetchData();
    } catch (error) {
      console.error('Erro ao adicionar cupom:', error);
      toast({ title: 'Erro ao adicionar cupom', variant: 'destructive' });
    }
  };

  const removeCouponFromCustomer = async (customerCouponId: string) => {
    try {
      const { error } = await supabase
        .from('customer_coupons')
        .delete()
        .eq('id', customerCouponId);

      if (error) throw error;
      toast({ title: 'Cupom removido do cliente' });
      fetchData();
    } catch (error) {
      console.error('Erro ao remover cupom:', error);
      toast({ title: 'Erro ao remover cupom', variant: 'destructive' });
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery) ||
    customer.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Cupons disponíveis para adicionar (não vinculados ao cliente)
  const getAvailableCoupons = (customerId: string) => {
    const linkedCouponIds = (customerCouponsMap[customerId] || []).map(cc => cc.coupon_id);
    return coupons.filter(c => !linkedCouponIds.includes(c.id));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex-col sm:flex-row gap-4">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="text-muted-foreground mt-1">Gerencie sua base de clientes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do cliente"
                />
              </div>

              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Número de telefone"
                />
              </div>

              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Endereço"
                />
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observações adicionais"
                  rows={3}
                />
              </div>

              {/* Cupons vinculados - apenas na edição */}
              {editingCustomer && (
                <div className="space-y-3 pt-4 border-t border-border">
                  <Label className="flex items-center gap-2">
                    <Ticket className="w-4 h-4" />
                    Cupons do Cliente
                  </Label>
                  
                  {/* Cupons vinculados */}
                  <div className="flex flex-wrap gap-2">
                    {(customerCouponsMap[editingCustomer.id] || []).map(cc => (
                      <Badge key={cc.id} variant="secondary" className="gap-1 pr-1">
                        {cc.coupons.code}
                        <button
                          type="button"
                          onClick={() => removeCouponFromCustomer(cc.id)}
                          className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    {(customerCouponsMap[editingCustomer.id] || []).length === 0 && (
                      <span className="text-sm text-muted-foreground">Nenhum cupom vinculado</span>
                    )}
                  </div>

                  {/* Adicionar cupom */}
                  {getAvailableCoupons(editingCustomer.id).length > 0 && (
                    <div className="flex gap-2">
                      <Select value={selectedCouponToAdd} onValueChange={setSelectedCouponToAdd}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Adicionar cupom..." />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableCoupons(editingCustomer.id).map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.code} ({c.discount_type === 'percentage' ? `${c.discount_value}%` : `R$ ${c.discount_value}`})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={!selectedCouponToAdd}
                        onClick={() => addCouponToCustomer(editingCustomer.id, selectedCouponToAdd)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-accent hover:bg-accent/90" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editingCustomer ? 'Atualizar' : 'Criar'}
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
          placeholder="Buscar clientes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customers Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum cliente encontrado</h3>
          <p className="text-muted-foreground mt-1">
            {searchQuery ? 'Tente um termo de busca diferente' : 'Adicione seu primeiro cliente'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(customer => (
            <div
              key={customer.id}
              className="bg-card border border-border/50 rounded-xl p-5 hover:shadow-medium transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {customer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="font-medium">{customer.name}</h3>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(customer)}
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
                        <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteCustomer(customer.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{customer.address}</span>
                  </div>
                )}
                
                {/* Cupons do cliente */}
                {(customerCouponsMap[customer.id] || []).length > 0 && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                    <Ticket className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex flex-wrap gap-1">
                      {customerCouponsMap[customer.id].map(cc => (
                        <Badge key={cc.id} variant="outline" className="text-xs">
                          {cc.coupons.code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {customer.notes && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {customer.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}