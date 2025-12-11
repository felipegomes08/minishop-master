import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  Edit2, 
  Copy, 
  Trash2, 
  Image as ImageIcon,
  X,
  Upload,
  Loader2,
  Check,
  Camera,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ImportFromPhotoDialog } from '@/components/products/ImportFromPhotoDialog';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotional_price: number | null;
  stock: number | null;
  category_id: string | null;
  images: string[];
  is_active: boolean;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

interface EditingRow {
  id: string;
  name: string;
  category_id: string;
  price: string;
  is_active: boolean;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingRow, setEditingRow] = useState<EditingRow | null>(null);
  const [savingRow, setSavingRow] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    promotional_price: '',
    stock: '',
    category_id: '',
    is_active: true,
    images: [] as string[]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*')
      ]);

      if (productsRes.data) setProducts(productsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
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
    setFormData({
      name: '',
      description: '',
      price: '',
      promotional_price: '',
      stock: '',
      category_id: '',
      is_active: true,
      images: []
    });
    setEditingProduct(null);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      promotional_price: product.promotional_price?.toString() || '',
      stock: product.stock?.toString() || '',
      category_id: product.category_id || '',
      is_active: product.is_active,
      images: product.images || []
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newImages: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('product-images')
          .upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        newImages.push(urlData.publicUrl);
      }

      setFormData(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
      toast({ title: 'Imagens enviadas com sucesso' });
    } catch (error) {
      console.error('Erro ao enviar imagens:', error);
      toast({ title: 'Erro ao enviar imagens', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price) {
      toast({ title: 'Nome e preço são obrigatórios', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        promotional_price: formData.promotional_price ? parseFloat(formData.promotional_price) : null,
        stock: formData.stock ? parseInt(formData.stock) : null,
        category_id: formData.category_id || null,
        is_active: formData.is_active,
        images: formData.images
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast({ title: 'Produto atualizado com sucesso' });
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;
        toast({ title: 'Produto criado com sucesso' });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast({ title: 'Erro ao salvar produto', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const duplicateProduct = async (product: Product) => {
    try {
      const { id, created_at, ...productData } = product;
      const { error } = await supabase
        .from('products')
        .insert([{ ...productData, name: `${product.name} (Cópia)` }]);

      if (error) throw error;
      toast({ title: 'Produto duplicado com sucesso' });
      fetchData();
    } catch (error) {
      console.error('Erro ao duplicar produto:', error);
      toast({ title: 'Erro ao duplicar produto', variant: 'destructive' });
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Produto excluído com sucesso' });
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast({ title: 'Erro ao excluir produto', variant: 'destructive' });
    }
  };

  const startEditingRow = (product: Product) => {
    setEditingRow({
      id: product.id,
      name: product.name,
      category_id: product.category_id || '',
      price: product.price.toString(),
      is_active: product.is_active
    });
  };

  const cancelEditingRow = () => {
    setEditingRow(null);
  };

  const saveEditingRow = async () => {
    if (!editingRow) return;
    
    if (!editingRow.name || !editingRow.price) {
      toast({ title: 'Nome e preço são obrigatórios', variant: 'destructive' });
      return;
    }

    setSavingRow(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: editingRow.name,
          category_id: editingRow.category_id || null,
          price: parseFloat(editingRow.price),
          is_active: editingRow.is_active
        })
        .eq('id', editingRow.id);

      if (error) throw error;
      
      // Update local state
      setProducts(prev => prev.map(p => 
        p.id === editingRow.id 
          ? { ...p, name: editingRow.name, category_id: editingRow.category_id || null, price: parseFloat(editingRow.price), is_active: editingRow.is_active }
          : p
      ));
      
      setEditingRow(null);
      toast({ title: 'Produto atualizado' });
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast({ title: 'Erro ao atualizar produto', variant: 'destructive' });
    } finally {
      setSavingRow(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category_id === filterCategory;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && product.is_active) ||
      (filterStatus === 'inactive' && !product.is_active);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return '-';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || '-';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex-col sm:flex-row gap-4">
        <div>
          <h1 className="page-title">Produtos</h1>
          <p className="text-muted-foreground mt-1">Gerencie seu catálogo de produtos</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setImportDialogOpen(true)}
          >
            <Camera className="w-4 h-4" />
            Importar da Nota
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
                <Plus className="w-4 h-4" />
                Adicionar Produto
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Nome *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do produto"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição do produto"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Preço *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Preço Promocional</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.promotional_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, promotional_price: e.target.value }))}
                    placeholder="Deixe vazio se não houver promoção"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estoque</Label>
                  <Input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                    placeholder="Opcional"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Imagens</Label>
                  <div className="flex flex-wrap gap-3">
                    {formData.images.map((img, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={img} 
                          alt="" 
                          className="w-20 h-20 object-cover rounded-lg border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <label className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-accent transition-colors">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                      {uploading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      ) : (
                        <Upload className="w-5 h-5 text-muted-foreground" />
                      )}
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 md:col-span-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label>Ativo</Label>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-accent hover:bg-accent/90" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editingProduct ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <ImportFromPhotoDialog 
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        categories={categories}
        onSuccess={fetchData}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products */}
      {loading ? (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16">
          <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum produto encontrado</h3>
          <p className="text-muted-foreground mt-1">
            {searchQuery || filterCategory !== 'all' || filterStatus !== 'all' 
              ? 'Tente ajustar seus filtros'
              : 'Adicione seu primeiro produto para começar'
            }
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredProducts.map(product => {
              const isEditing = editingRow?.id === product.id;
              
              return (
                <div key={product.id} className="bg-card border border-border rounded-lg p-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="w-14 h-14 rounded-md overflow-hidden bg-secondary flex-shrink-0 flex items-center justify-center">
                          {product.images && product.images.length > 0 ? (
                            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <Input
                            value={editingRow.name}
                            onChange={(e) => setEditingRow(prev => prev ? { ...prev, name: e.target.value } : null)}
                            className="h-8 text-sm"
                            placeholder="Nome"
                          />
                          <div className="flex gap-2">
                            <Select
                              value={editingRow.category_id || "none"}
                              onValueChange={(value) => setEditingRow(prev => prev ? { ...prev, category_id: value === "none" ? "" : value } : null)}
                            >
                              <SelectTrigger className="h-8 flex-1 text-sm">
                                <SelectValue placeholder="Categoria" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sem categoria</SelectItem>
                                {categories.map(cat => (
                                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              step="0.01"
                              value={editingRow.price}
                              onChange={(e) => setEditingRow(prev => prev ? { ...prev, price: e.target.value } : null)}
                              className="h-8 w-24 text-sm"
                              placeholder="Preço"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={editingRow.is_active}
                            onCheckedChange={(checked) => setEditingRow(prev => prev ? { ...prev, is_active: checked } : null)}
                          />
                          <span className="text-sm text-muted-foreground">{editingRow.is_active ? 'Ativo' : 'Inativo'}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={cancelEditingRow}>
                            Cancelar
                          </Button>
                          <Button size="sm" onClick={saveEditingRow} disabled={savingRow} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                            {savingRow ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <div 
                        className="w-14 h-14 rounded-md overflow-hidden bg-secondary flex-shrink-0 flex items-center justify-center cursor-pointer"
                        onClick={() => startEditingRow(product)}
                      >
                        {product.images && product.images.length > 0 ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1" onClick={() => startEditingRow(product)}>
                            <h3 className="font-medium truncate cursor-pointer hover:text-accent transition-colors">
                              {product.name}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {getCategoryName(product.category_id)}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(product)}>
                                <Edit2 className="w-4 h-4 mr-2" />
                                Editar completo
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => duplicateProduct(product)}>
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteProduct(product.id)} className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div onClick={() => startEditingRow(product)} className="cursor-pointer">
                            {product.promotional_price ? (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-success">{formatCurrency(product.promotional_price)}</span>
                                <span className="text-xs text-muted-foreground line-through">{formatCurrency(product.price)}</span>
                              </div>
                            ) : (
                              <span className="font-medium">{formatCurrency(product.price)}</span>
                            )}
                          </div>
                          <Badge
                            className={cn(
                              "cursor-pointer",
                              product.is_active 
                                ? "bg-success/10 text-success border-success/20" 
                                : "bg-muted text-muted-foreground"
                            )}
                            variant="outline"
                            onClick={() => startEditingRow(product)}
                          >
                            {product.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block border border-border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-16">Imagem</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-40">Categoria</TableHead>
                  <TableHead className="w-32">Preço</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-32 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => {
                  const isEditing = editingRow?.id === product.id;
                  
                  return (
                    <TableRow key={product.id} className="group">
                      <TableCell>
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-secondary flex items-center justify-center">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editingRow.name}
                            onChange={(e) => setEditingRow(prev => prev ? { ...prev, name: e.target.value } : null)}
                            className="h-8"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="cursor-pointer hover:text-accent transition-colors"
                            onClick={() => startEditingRow(product)}
                          >
                            {product.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={editingRow.category_id || "none"}
                            onValueChange={(value) => setEditingRow(prev => prev ? { ...prev, category_id: value === "none" ? "" : value } : null)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Selecionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem categoria</SelectItem>
                              {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span 
                            className="cursor-pointer hover:text-accent transition-colors text-muted-foreground"
                            onClick={() => startEditingRow(product)}
                          >
                            {getCategoryName(product.category_id)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editingRow.price}
                            onChange={(e) => setEditingRow(prev => prev ? { ...prev, price: e.target.value } : null)}
                            className="h-8"
                          />
                        ) : (
                          <div 
                            className="cursor-pointer hover:text-accent transition-colors"
                            onClick={() => startEditingRow(product)}
                          >
                            {product.promotional_price ? (
                              <div className="flex flex-col">
                                <span className="font-medium text-success text-sm">{formatCurrency(product.promotional_price)}</span>
                                <span className="text-xs text-muted-foreground line-through">{formatCurrency(product.price)}</span>
                              </div>
                            ) : (
                              <span className="font-medium">{formatCurrency(product.price)}</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={editingRow.is_active}
                              onCheckedChange={(checked) => setEditingRow(prev => prev ? { ...prev, is_active: checked } : null)}
                            />
                            <span className="text-xs text-muted-foreground">{editingRow.is_active ? 'Ativo' : 'Inativo'}</span>
                          </div>
                        ) : (
                          <Badge
                            className={cn(
                              "cursor-pointer",
                              product.is_active 
                                ? "bg-success/10 text-success border-success/20" 
                                : "bg-muted text-muted-foreground"
                            )}
                            variant="outline"
                            onClick={() => startEditingRow(product)}
                          >
                            {product.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-success hover:text-success"
                              onClick={saveEditingRow}
                              disabled={savingRow}
                            >
                              {savingRow ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={cancelEditingRow}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(product)}
                              title="Edição completa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => duplicateProduct(product)}
                              title="Duplicar"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteProduct(product.id)}
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}