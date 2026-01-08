import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Loader2, Package } from 'lucide-react';
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
  options: AttributeOption[];
}

interface ProductVariant {
  id: string;
  product_id: string;
  sku: string | null;
  price_adjustment: number;
  stock: number;
  is_active: boolean;
  options: AttributeOption[];
}

interface ProductVariantEditorProps {
  productId: string | null;
  basePrice: number;
}

export function ProductVariantEditor({ productId, basePrice }: ProductVariantEditorProps) {
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [newVariant, setNewVariant] = useState({
    sku: '',
    price_adjustment: '0',
    stock: '0'
  });

  useEffect(() => {
    fetchData();
  }, [productId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch attributes with options
      const { data: attrData } = await supabase
        .from('product_attributes')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      const { data: optionsData } = await supabase
        .from('attribute_options')
        .select('*')
        .order('sort_order');

      const attributesWithOptions = (attrData || []).map(attr => ({
        ...attr,
        options: (optionsData || []).filter(opt => opt.attribute_id === attr.id)
      })).filter(attr => attr.options.length > 0);

      setAttributes(attributesWithOptions);

      // Fetch existing variants if editing
      if (productId) {
        const { data: variantData } = await supabase
          .from('product_variants')
          .select('*')
          .eq('product_id', productId)
          .order('created_at');

        if (variantData) {
          // Fetch variant options
          const variantIds = variantData.map(v => v.id);
          const { data: variantOptionsData } = await supabase
            .from('product_variant_options')
            .select('*, attribute_options(*)')
            .in('variant_id', variantIds);

          const variantsWithOptions = variantData.map(variant => ({
            ...variant,
            options: (variantOptionsData || [])
              .filter(vo => vo.variant_id === variant.id)
              .map(vo => vo.attribute_options as AttributeOption)
          }));

          setVariants(variantsWithOptions);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOption = (optionId: string) => {
    setSelectedOptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(optionId)) {
        newSet.delete(optionId);
      } else {
        newSet.add(optionId);
      }
      return newSet;
    });
  };

  const getOptionLabel = (optionId: string) => {
    for (const attr of attributes) {
      const option = attr.options.find(o => o.id === optionId);
      if (option) return { attr: attr.name, option };
    }
    return null;
  };

  const addVariant = async () => {
    if (!productId) {
      toast({ title: 'Salve o produto primeiro', variant: 'destructive' });
      return;
    }

    if (selectedOptions.size === 0) {
      toast({ title: 'Selecione pelo menos uma opção', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Create variant
      const { data: variantData, error: variantError } = await supabase
        .from('product_variants')
        .insert([{
          product_id: productId,
          sku: newVariant.sku || null,
          price_adjustment: parseFloat(newVariant.price_adjustment) || 0,
          stock: parseInt(newVariant.stock) || 0,
          is_active: true
        }])
        .select()
        .single();

      if (variantError) throw variantError;

      // Create variant options
      const variantOptions = Array.from(selectedOptions).map(optionId => ({
        variant_id: variantData.id,
        option_id: optionId
      }));

      const { error: optionsError } = await supabase
        .from('product_variant_options')
        .insert(variantOptions);

      if (optionsError) throw optionsError;

      toast({ title: 'Variante adicionada com sucesso' });
      setSelectedOptions(new Set());
      setNewVariant({ sku: '', price_adjustment: '0', stock: '0' });
      fetchData();
    } catch (error) {
      console.error('Erro ao adicionar variante:', error);
      toast({ title: 'Erro ao adicionar variante', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateVariant = async (variantId: string, field: string, value: string | boolean) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (field === 'stock') {
        updateData.stock = parseInt(value as string) || 0;
      } else if (field === 'price_adjustment') {
        updateData.price_adjustment = parseFloat(value as string) || 0;
      } else if (field === 'is_active') {
        updateData.is_active = value as boolean;
      } else if (field === 'sku') {
        updateData.sku = value || null;
      }

      const { error } = await supabase
        .from('product_variants')
        .update(updateData)
        .eq('id', variantId);

      if (error) throw error;

      setVariants(prev => prev.map(v => 
        v.id === variantId ? { ...v, ...updateData } : v
      ));
    } catch (error) {
      console.error('Erro ao atualizar variante:', error);
      toast({ title: 'Erro ao atualizar variante', variant: 'destructive' });
    }
  };

  const deleteVariant = async (variantId: string) => {
    try {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', variantId);

      if (error) throw error;

      setVariants(prev => prev.filter(v => v.id !== variantId));
      toast({ title: 'Variante excluída' });
    } catch (error) {
      console.error('Erro ao excluir variante:', error);
      toast({ title: 'Erro ao excluir variante', variant: 'destructive' });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (attributes.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhum atributo cadastrado. Acesse a página de Atributos para criar Tamanho, Cor, etc.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add New Variant */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Adicionar Variante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Attribute Options Selection */}
          <div className="space-y-3">
            {attributes.map(attr => (
              <div key={attr.id} className="space-y-2">
                <Label className="text-xs text-muted-foreground">{attr.name}</Label>
                <div className="flex flex-wrap gap-2">
                  {attr.options.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleOption(option.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors",
                        selectedOptions.has(option.id)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-muted-foreground"
                      )}
                    >
                      {option.image_url && (
                        <img 
                          src={option.image_url} 
                          alt="" 
                          className="w-4 h-4 rounded object-cover"
                        />
                      )}
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Variant Details */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">SKU (opcional)</Label>
              <Input
                value={newVariant.sku}
                onChange={e => setNewVariant(prev => ({ ...prev, sku: e.target.value }))}
                placeholder="ABC-123"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ajuste de Preço (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={newVariant.price_adjustment}
                onChange={e => setNewVariant(prev => ({ ...prev, price_adjustment: e.target.value }))}
                placeholder="0,00"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Estoque</Label>
              <Input
                type="number"
                value={newVariant.stock}
                onChange={e => setNewVariant(prev => ({ ...prev, stock: e.target.value }))}
                placeholder="0"
                className="h-9"
              />
            </div>
          </div>

          <Button 
            type="button"
            onClick={addVariant} 
            disabled={saving || selectedOptions.size === 0}
            size="sm"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Plus className="w-4 h-4 mr-1" />
            Adicionar Variante
          </Button>
        </CardContent>
      </Card>

      {/* Existing Variants */}
      {variants.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">
              Variantes Cadastradas ({variants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {variants.map(variant => (
                <div 
                  key={variant.id}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-lg border",
                    !variant.is_active && "opacity-60"
                  )}
                >
                  {/* Options */}
                  <div className="flex-1 flex flex-wrap gap-2">
                    {variant.options.map(option => (
                      <Badge key={option.id} variant="secondary" className="gap-1">
                        {option.image_url && (
                          <img 
                            src={option.image_url} 
                            alt="" 
                            className="w-3 h-3 rounded object-cover"
                          />
                        )}
                        {option.label}
                      </Badge>
                    ))}
                  </div>

                  {/* SKU */}
                  <Input
                    value={variant.sku || ''}
                    onChange={e => updateVariant(variant.id, 'sku', e.target.value)}
                    placeholder="SKU"
                    className="w-24 h-8 text-xs"
                  />

                  {/* Price */}
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Preço Final</div>
                    <div className="text-sm font-medium">
                      {formatCurrency(basePrice + variant.price_adjustment)}
                    </div>
                  </div>

                  {/* Adjustment */}
                  <Input
                    type="number"
                    step="0.01"
                    value={variant.price_adjustment}
                    onChange={e => updateVariant(variant.id, 'price_adjustment', e.target.value)}
                    className="w-20 h-8 text-xs"
                  />

                  {/* Stock */}
                  <Input
                    type="number"
                    value={variant.stock}
                    onChange={e => updateVariant(variant.id, 'stock', e.target.value)}
                    className="w-16 h-8 text-xs"
                  />

                  {/* Active Toggle */}
                  <Switch
                    checked={variant.is_active}
                    onCheckedChange={checked => updateVariant(variant.id, 'is_active', checked)}
                  />

                  {/* Delete */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => deleteVariant(variant.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
