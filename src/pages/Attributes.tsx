import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Upload,
  Loader2,
  X,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttributeOption {
  id: string;
  attribute_id: string;
  label: string;
  image_url: string | null;
  sort_order: number;
}

interface ProductAttribute {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  options?: AttributeOption[];
}

export default function Attributes() {
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<ProductAttribute | null>(null);
  const [editingOption, setEditingOption] = useState<AttributeOption | null>(null);
  const [selectedAttribute, setSelectedAttribute] = useState<ProductAttribute | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'attribute' | 'option'; id: string } | null>(null);
  const [expandedAttributes, setExpandedAttributes] = useState<Set<string>>(new Set());

  // Form state for attributes
  const [attributeForm, setAttributeForm] = useState({
    name: '',
    is_active: true
  });

  // Form state for options
  const [optionForm, setOptionForm] = useState({
    label: '',
    image_url: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: attributesData, error: attrError } = await supabase
        .from('product_attributes')
        .select('*')
        .order('sort_order');

      if (attrError) throw attrError;

      const { data: optionsData, error: optError } = await supabase
        .from('attribute_options')
        .select('*')
        .order('sort_order');

      if (optError) throw optError;

      const attributesWithOptions = (attributesData || []).map(attr => ({
        ...attr,
        options: (optionsData || []).filter(opt => opt.attribute_id === attr.id)
      }));

      setAttributes(attributesWithOptions);
      
      // Expand all by default
      setExpandedAttributes(new Set(attributesWithOptions.map(a => a.id)));
    } catch (error) {
      console.error('Erro ao buscar atributos:', error);
      toast({ title: 'Erro ao carregar atributos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetAttributeForm = () => {
    setAttributeForm({ name: '', is_active: true });
    setEditingAttribute(null);
  };

  const resetOptionForm = () => {
    setOptionForm({ label: '', image_url: '' });
    setEditingOption(null);
  };

  const openEditAttributeDialog = (attr: ProductAttribute) => {
    setEditingAttribute(attr);
    setAttributeForm({
      name: attr.name,
      is_active: attr.is_active
    });
    setDialogOpen(true);
  };

  const openAddOptionDialog = (attr: ProductAttribute) => {
    setSelectedAttribute(attr);
    resetOptionForm();
    setOptionDialogOpen(true);
  };

  const openEditOptionDialog = (attr: ProductAttribute, option: AttributeOption) => {
    setSelectedAttribute(attr);
    setEditingOption(option);
    setOptionForm({
      label: option.label,
      image_url: option.image_url || ''
    });
    setOptionDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `option-${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      setOptionForm(prev => ({ ...prev, image_url: urlData.publicUrl }));
      toast({ title: 'Imagem enviada com sucesso' });
    } catch (error) {
      console.error('Erro ao enviar imagem:', error);
      toast({ title: 'Erro ao enviar imagem', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!attributeForm.name.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (editingAttribute) {
        const { error } = await supabase
          .from('product_attributes')
          .update({
            name: attributeForm.name,
            is_active: attributeForm.is_active
          })
          .eq('id', editingAttribute.id);

        if (error) throw error;
        toast({ title: 'Atributo atualizado com sucesso' });
      } else {
        const maxSortOrder = Math.max(0, ...attributes.map(a => a.sort_order));
        const { error } = await supabase
          .from('product_attributes')
          .insert([{
            name: attributeForm.name,
            is_active: attributeForm.is_active,
            sort_order: maxSortOrder + 1
          }]);

        if (error) throw error;
        toast({ title: 'Atributo criado com sucesso' });
      }

      setDialogOpen(false);
      resetAttributeForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar atributo:', error);
      toast({ title: 'Erro ao salvar atributo', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOption = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!optionForm.label.trim() || !selectedAttribute) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (editingOption) {
        const { error } = await supabase
          .from('attribute_options')
          .update({
            label: optionForm.label,
            image_url: optionForm.image_url || null
          })
          .eq('id', editingOption.id);

        if (error) throw error;
        toast({ title: 'Opção atualizada com sucesso' });
      } else {
        const currentOptions = selectedAttribute.options || [];
        const maxSortOrder = Math.max(0, ...currentOptions.map(o => o.sort_order));
        
        const { error } = await supabase
          .from('attribute_options')
          .insert([{
            attribute_id: selectedAttribute.id,
            label: optionForm.label,
            image_url: optionForm.image_url || null,
            sort_order: maxSortOrder + 1
          }]);

        if (error) throw error;
        toast({ title: 'Opção criada com sucesso' });
      }

      setOptionDialogOpen(false);
      resetOptionForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar opção:', error);
      toast({ title: 'Erro ao salvar opção', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'attribute') {
        const { error } = await supabase
          .from('product_attributes')
          .delete()
          .eq('id', deleteTarget.id);

        if (error) throw error;
        toast({ title: 'Atributo excluído com sucesso' });
      } else {
        const { error } = await supabase
          .from('attribute_options')
          .delete()
          .eq('id', deleteTarget.id);

        if (error) throw error;
        toast({ title: 'Opção excluída com sucesso' });
      }

      setDeleteTarget(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    }
  };

  const toggleExpanded = (attrId: string) => {
    setExpandedAttributes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(attrId)) {
        newSet.delete(attrId);
      } else {
        newSet.add(attrId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex-col sm:flex-row gap-4">
        <div>
          <h1 className="page-title">Atributos</h1>
          <p className="text-muted-foreground mt-1">Gerencie os atributos de produtos como tamanho, cor, material</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetAttributeForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
              <Plus className="w-4 h-4" />
              Novo Atributo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAttribute ? 'Editar Atributo' : 'Novo Atributo'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveAttribute} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={attributeForm.name}
                  onChange={(e) => setAttributeForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Tamanho, Cor, Material"
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="is_active"
                  checked={attributeForm.is_active}
                  onCheckedChange={(checked) => setAttributeForm(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Ativo</Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingAttribute ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Attribute Option Dialog */}
      <Dialog open={optionDialogOpen} onOpenChange={(open) => { setOptionDialogOpen(open); if (!open) resetOptionForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingOption ? 'Editar Opção' : 'Nova Opção'}
              {selectedAttribute && <span className="text-muted-foreground font-normal"> - {selectedAttribute.name}</span>}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveOption} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={optionForm.label}
                onChange={(e) => setOptionForm(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Ex: P, M, G, Azul, Vermelho"
              />
            </div>

            <div className="space-y-2">
              <Label>Imagem (opcional)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Ideal para cores ou materiais que precisam de representação visual
              </p>
              <div className="flex items-center gap-3">
                {optionForm.image_url ? (
                  <div className="relative group">
                    <img 
                      src={optionForm.image_url} 
                      alt="" 
                      className="w-16 h-16 object-cover rounded-lg border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => setOptionForm(prev => ({ ...prev, image_url: '' }))}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="w-16 h-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-accent transition-colors">
                    <input
                      type="file"
                      accept="image/*"
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
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOptionDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingOption ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'attribute' 
                ? 'Isso excluirá o atributo e todas as suas opções. Esta ação não pode ser desfeita.'
                : 'Esta ação não pode ser desfeita.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Attributes List */}
      {attributes.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <GripVertical className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium">Nenhum atributo cadastrado</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Crie atributos como Tamanho, Cor, Material para adicionar variações aos seus produtos.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {attributes.map(attr => (
            <Card key={attr.id} className={cn(!attr.is_active && "opacity-60")}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => toggleExpanded(attr.id)}
                    className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                  >
                    {expandedAttributes.has(attr.id) ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <CardTitle className="text-base">{attr.name}</CardTitle>
                    {!attr.is_active && (
                      <Badge variant="secondary" className="text-xs">Inativo</Badge>
                    )}
                    <Badge variant="outline" className="text-xs ml-2">
                      {attr.options?.length || 0} opções
                    </Badge>
                  </button>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openAddOptionDialog(attr)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Opção
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditAttributeDialog(attr)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget({ type: 'attribute', id: attr.id })}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {expandedAttributes.has(attr.id) && (
                <CardContent className="pt-0 px-4 pb-4">
                  {attr.options && attr.options.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {attr.options.map(option => (
                        <div 
                          key={option.id}
                          className="group flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                        >
                          {option.image_url ? (
                            <img 
                              src={option.image_url} 
                              alt={option.label}
                              className="w-6 h-6 rounded object-cover"
                            />
                          ) : (
                            <span className="w-6 h-6 rounded bg-background flex items-center justify-center text-xs font-medium">
                              {option.label.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span className="text-sm font-medium">{option.label}</span>
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-1 transition-opacity">
                            <button 
                              onClick={() => openEditOptionDialog(attr, option)}
                              className="p-1 hover:bg-background rounded"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => setDeleteTarget({ type: 'option', id: option.id })}
                              className="p-1 hover:bg-background rounded text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma opção cadastrada. Clique em "+ Opção" para adicionar.
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
