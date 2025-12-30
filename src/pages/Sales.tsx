import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, 
  Search, 
  ShoppingCart,
  Minus,
  CalendarIcon,
  Loader2,
  Receipt,
  Eye,
  Ticket,
  X,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface Product {
  id: string;
  name: string;
  price: number;
  promotional_price: number | null;
  stock: number | null;
  images: string[];
}

interface Customer {
  id: string;
  name: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_purchase: number;
  max_uses: number | null;
  current_uses: number;
  valid_until: string | null;
  is_active: boolean;
}

interface CustomerCoupon {
  coupon_id: string;
  coupons: Coupon;
}

interface Sale {
  id: string;
  customer_id: string | null;
  total: number;
  subtotal: number | null;
  coupon_discount: number | null;
  manual_discount: number | null;
  status: string;
  created_at: string;
  customers?: { name: string } | null;
  sale_items?: { product_id: string; product_name: string; quantity: number; unit_price: number; total_price: number }[];
}

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [customerCoupons, setCustomerCoupons] = useState<CustomerCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [manualDiscount, setManualDiscount] = useState<number>(0);
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const fromDate = dateRange?.from ? startOfDay(dateRange.from).toISOString() : undefined;
      const toDate = dateRange?.to ? endOfDay(dateRange.to).toISOString() : undefined;

      let salesQuery = supabase
        .from('sales')
        .select('*, customers(name), sale_items(*)')
        .order('created_at', { ascending: false });

      if (fromDate) salesQuery = salesQuery.gte('created_at', fromDate);
      if (toDate) salesQuery = salesQuery.lte('created_at', toDate);

      const [salesRes, productsRes, customersRes, couponsRes] = await Promise.all([
        salesQuery,
        supabase.from('products').select('*').eq('is_active', true),
        supabase.from('customers').select('id, name'),
        supabase.from('coupons').select('*').eq('is_active', true)
      ]);

      if (salesRes.data) setSales(salesRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      if (customersRes.data) setCustomers(customersRes.data);
      if (couponsRes.data) setCoupons(couponsRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar cupons do cliente quando selecionado
  useEffect(() => {
    const fetchCustomerCoupons = async () => {
      if (!selectedCustomer) {
        setCustomerCoupons([]);
        return;
      }
      
      const { data } = await supabase
        .from('customer_coupons')
        .select('coupon_id, coupons(*)')
        .eq('customer_id', selectedCustomer);
      
      if (data) {
        setCustomerCoupons(data as unknown as CustomerCoupon[]);
      }
    };
    
    fetchCustomerCoupons();
  }, [selectedCustomer]);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const resetCart = () => {
    setCart([]);
    setSelectedCustomer('');
    setProductSearch('');
    setCouponCode('');
    setAppliedCoupon(null);
    setManualDiscount(0);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev
      .map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      })
      .filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const getPrice = (product: Product) => {
    return product.promotional_price || product.price;
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + getPrice(item.product) * item.quantity, 0);
  
  const couponDiscount = appliedCoupon 
    ? appliedCoupon.discount_type === 'percentage'
      ? (cartSubtotal * appliedCoupon.discount_value) / 100
      : appliedCoupon.discount_value
    : 0;
  
  const totalDiscount = couponDiscount + manualDiscount;
  const cartTotal = Math.max(0, cartSubtotal - totalDiscount);

  const applyCoupon = () => {
    if (!couponCode.trim()) return;
    
    const coupon = coupons.find(c => c.code.toLowerCase() === couponCode.toLowerCase());
    
    if (!coupon) {
      toast({ title: 'Cupom não encontrado', variant: 'destructive' });
      return;
    }

    if (!coupon.is_active) {
      toast({ title: 'Cupom inativo', variant: 'destructive' });
      return;
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      toast({ title: 'Cupom expirado', variant: 'destructive' });
      return;
    }

    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      toast({ title: 'Cupom esgotado', variant: 'destructive' });
      return;
    }

    if (cartSubtotal < coupon.min_purchase) {
      toast({ 
        title: 'Valor mínimo não atingido', 
        description: `Compra mínima: ${formatCurrency(coupon.min_purchase)}`,
        variant: 'destructive' 
      });
      return;
    }

    setAppliedCoupon(coupon);
    setCouponCode('');
    toast({ title: 'Cupom aplicado!' });
  };

  const applyCustomerCoupon = (coupon: Coupon) => {
    if (cartSubtotal < coupon.min_purchase) {
      toast({ 
        title: 'Valor mínimo não atingido', 
        description: `Compra mínima: ${formatCurrency(coupon.min_purchase)}`,
        variant: 'destructive' 
      });
      return;
    }
    setAppliedCoupon(coupon);
    toast({ title: 'Cupom aplicado!' });
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      toast({ title: 'Carrinho vazio', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([{
          customer_id: selectedCustomer || null,
          subtotal: cartSubtotal,
          coupon_id: appliedCoupon?.id || null,
          coupon_discount: couponDiscount,
          manual_discount: manualDiscount,
          total: cartTotal,
          status: 'concluída'
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // Update coupon uses if applied
      if (appliedCoupon) {
        await supabase
          .from('coupons')
          .update({ current_uses: appliedCoupon.current_uses + 1 })
          .eq('id', appliedCoupon.id);
      }

      // Create sale items
      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: getPrice(item.product),
        total_price: getPrice(item.product) * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      toast({ title: 'Venda finalizada com sucesso!' });
      setDialogOpen(false);
      resetCart();
      fetchData();
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
      toast({ title: 'Erro ao finalizar venda', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredSales = sales.filter(sale =>
    sale.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const viewSaleDetails = (sale: Sale) => {
    setViewingSale(sale);
    setViewDialogOpen(true);
  };

  const deleteSale = async (sale: Sale) => {
    setSaleToDelete(sale);
  };

  const confirmDeleteSale = async () => {
    if (!saleToDelete) return;
    
    const sale = saleToDelete;
    setSaleToDelete(null);

    setDeletingSaleId(sale.id);

    try {
      // Restore stock for each item
      if (sale.sale_items && sale.sale_items.length > 0) {
        for (const item of sale.sale_items) {
          if (item.product_id) {
            // Get current stock
            const { data: product } = await supabase
              .from('products')
              .select('stock')
              .eq('id', item.product_id)
              .single();

            if (product && product.stock !== null) {
              // Restore stock
              await supabase
                .from('products')
                .update({ stock: product.stock + item.quantity })
                .eq('id', item.product_id);
            }
          }
        }
      }

      // Delete sale items first (foreign key constraint)
      const { error: itemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', sale.id);

      if (itemsError) throw itemsError;

      // Delete the sale
      const { error: saleError } = await supabase
        .from('sales')
        .delete()
        .eq('id', sale.id);

      if (saleError) throw saleError;

      toast({ title: 'Venda excluída com sucesso! Estoque restaurado.' });
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir venda:', error);
      toast({ title: 'Erro ao excluir venda', variant: 'destructive' });
    } finally {
      setDeletingSaleId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex-col sm:flex-row gap-4">
        <div>
          <h1 className="page-title">Vendas</h1>
          <p className="text-muted-foreground mt-1">Gerencie pedidos e processe vendas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetCart(); }}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
              <Plus className="w-4 h-4" />
              Nova Venda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Nova Venda</DialogTitle>
            </DialogHeader>
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
              {/* Products */}
              <div className="flex flex-col overflow-hidden min-w-0">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produtos..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 min-h-0">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-secondary/50 transition-colors text-left"
                    >
                      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        <div className="flex items-center gap-2">
                          {product.promotional_price ? (
                            <>
                              <span className="text-sm text-success font-medium">
                                {formatCurrency(product.promotional_price)}
                              </span>
                              <span className="text-xs text-muted-foreground line-through">
                                {formatCurrency(product.price)}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-medium">{formatCurrency(product.price)}</span>
                          )}
                        </div>
                      </div>
                      {product.stock !== null && (
                        <Badge variant="outline" className="shrink-0 hidden sm:flex">
                          {product.stock}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cart */}
              <div className="flex flex-col bg-secondary/30 rounded-xl p-4 overflow-y-auto min-w-0">
                <h3 className="font-medium mb-4">Carrinho</h3>
                
                <div className="overflow-y-auto space-y-3 mb-4 min-h-[120px] max-h-[200px]">
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Carrinho vazio</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.product.id} className="flex items-center gap-2 bg-card p-3 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(getPrice(item.product))}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.product.id, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.product.id, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="font-medium text-sm w-16 text-right shrink-0">
                          {formatCurrency(getPrice(item.product) * item.quantity)}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  {/* Cliente */}
                  <div className="space-y-2">
                    <Label className="text-xs">Cliente (opcional)</Label>
                    <Select value={selectedCustomer || "none"} onValueChange={(value) => setSelectedCustomer(value === "none" ? "" : value)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem cliente</SelectItem>
                        {customers.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Cupons do cliente */}
                  {selectedCustomer && customerCoupons.length > 0 && !appliedCoupon && (
                    <div className="space-y-2">
                      <Label className="text-xs">Cupons do cliente</Label>
                      <div className="flex flex-wrap gap-2">
                        {customerCoupons.map(cc => (
                          <Button
                            key={cc.coupon_id}
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1"
                            onClick={() => applyCustomerCoupon(cc.coupons)}
                          >
                            <Ticket className="w-3 h-3" />
                            {cc.coupons.code}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Aplicar Cupom */}
                  {!appliedCoupon ? (
                    <div className="space-y-2">
                      <Label className="text-xs">Cupom de desconto</Label>
                      <div className="flex gap-2">
                        <Input
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="Código do cupom"
                          className="h-9 uppercase text-xs"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={applyCoupon}
                          disabled={!couponCode.trim()}
                        >
                          Aplicar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-success/10 p-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-success" />
                        <span className="text-sm font-medium">{appliedCoupon.code}</span>
                        <span className="text-xs text-success">
                          -{appliedCoupon.discount_type === 'percentage' 
                            ? `${appliedCoupon.discount_value}%` 
                            : formatCurrency(appliedCoupon.discount_value)
                          }
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={removeCoupon}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}

                  {/* Desconto Manual */}
                  <div className="space-y-2">
                    <Label className="text-xs">Desconto manual (R$)</Label>
                    <Input
                      type="number"
                      value={manualDiscount || ''}
                      onChange={(e) => setManualDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      className="h-9 text-xs"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Resumo */}
                  <div className="space-y-1 text-sm pt-2 border-t border-border">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatCurrency(cartSubtotal)}</span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-success">
                        <span>Desconto</span>
                        <span>-{formatCurrency(totalDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-base pt-1">
                      <span>Total</span>
                      <span>{formatCurrency(cartTotal)}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-accent hover:bg-accent/90"
                    disabled={cart.length === 0 || saving}
                    onClick={handleCompleteSale}
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Finalizar Venda
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar vendas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 shrink-0">
              <CalendarIcon className="w-4 h-4" />
              <span className="hidden sm:inline">
                {dateRange?.from && dateRange?.to ? (
                  <>
                    {format(dateRange.from, 'd MMM', { locale: ptBR })} - {format(dateRange.to, 'd MMM', { locale: ptBR })}
                  </>
                ) : (
                  'Datas'
                )}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Sales List */}
      {loading ? (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="text-center py-16">
          <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhuma venda encontrada</h3>
          <p className="text-muted-foreground mt-1">
            {searchQuery ? 'Tente uma busca diferente' : 'Crie sua primeira venda'}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Data</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Cliente</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Itens</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Total</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(sale => (
                  <tr key={sale.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium">{format(new Date(sale.created_at), "d 'de' MMM", { locale: ptBR })}</span>
                      <span className="text-muted-foreground text-sm block">
                        {format(new Date(sale.created_at), 'HH:mm', { locale: ptBR })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {sale.customers?.name || <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      {sale.sale_items?.length || 0} itens
                    </td>
                    <td className="px-4 py-3 font-semibold text-success">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="bg-success/10 text-success border-success/20" variant="outline">
                        {sale.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => viewSaleDetails(sale)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteSale(sale)}
                          disabled={deletingSaleId === sale.id}
                        >
                          {deletingSaleId === sale.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Sale Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Venda</DialogTitle>
          </DialogHeader>
          {viewingSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Data</span>
                  <p className="font-medium">{format(new Date(viewingSale.created_at), "PPP 'às' HH:mm", { locale: ptBR })}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Cliente</span>
                  <p className="font-medium">{viewingSale.customers?.name || '-'}</p>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="font-medium mb-3">Itens</h4>
                <div className="space-y-2">
                  {viewingSale.sale_items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{item.product_name} × {item.quantity}</span>
                      <span className="font-medium">{formatCurrency(item.total_price)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-2 text-sm">
                {viewingSale.subtotal && viewingSale.subtotal !== viewingSale.total && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatCurrency(viewingSale.subtotal)}</span>
                    </div>
                    {(viewingSale.coupon_discount || 0) > 0 && (
                      <div className="flex justify-between text-success">
                        <span>Cupom</span>
                        <span>-{formatCurrency(viewingSale.coupon_discount || 0)}</span>
                      </div>
                    )}
                    {(viewingSale.manual_discount || 0) > 0 && (
                      <div className="flex justify-between text-success">
                        <span>Desconto manual</span>
                        <span>-{formatCurrency(viewingSale.manual_discount || 0)}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between items-center pt-2">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-success">{formatCurrency(viewingSale.total)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!saleToDelete} onOpenChange={(open) => !open && setSaleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Excluir Venda</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Tem certeza que deseja excluir esta venda?</p>
              {saleToDelete && (
                <div className="bg-secondary/50 rounded-lg p-3 mt-2">
                  <p className="font-medium">Valor: {formatCurrency(saleToDelete.total)}</p>
                  <p className="text-sm text-muted-foreground">
                    {saleToDelete.sale_items?.length || 0} item(ns) • {saleToDelete.customers?.name || 'Sem cliente'}
                  </p>
                </div>
              )}
              <p className="text-sm text-warning mt-2">
                ⚠️ Os itens serão devolvidos ao estoque automaticamente.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={confirmDeleteSale}
            >
              Excluir Venda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}