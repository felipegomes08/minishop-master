import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AttributeOption {
  id: string;
  attribute_id: string;
  label: string;
  image_url: string | null;
  sort_order: number;
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

interface GroupedAttribute {
  id: string;
  name: string;
  options: AttributeOption[];
}

interface VariantSelectorProps {
  productId: string;
  basePrice: number;
  onVariantChange: (variant: ProductVariant | null, finalPrice: number) => void;
}

export function VariantSelector({ productId, basePrice, onVariantChange }: VariantSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [groupedAttributes, setGroupedAttributes] = useState<GroupedAttribute[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  useEffect(() => {
    fetchVariants();
  }, [productId]);

  const fetchVariants = async () => {
    setLoading(true);
    try {
      // Fetch product variants
      const { data: variantData } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .eq('is_active', true);

      if (!variantData || variantData.length === 0) {
        setLoading(false);
        onVariantChange(null, basePrice);
        return;
      }

      // Fetch variant options
      const variantIds = variantData.map(v => v.id);
      const { data: variantOptionsData } = await supabase
        .from('product_variant_options')
        .select('*, attribute_options(*, product_attributes(*))')
        .in('variant_id', variantIds);

      // Build variants with options
      const variantsWithOptions: ProductVariant[] = variantData.map(variant => ({
        ...variant,
        options: (variantOptionsData || [])
          .filter(vo => vo.variant_id === variant.id)
          .map(vo => vo.attribute_options as AttributeOption)
      }));

      setVariants(variantsWithOptions);

      // Group options by attribute for display
      const attributesMap = new Map<string, GroupedAttribute>();
      
      if (variantOptionsData) {
        for (const vo of variantOptionsData) {
          const attrOpt = vo.attribute_options as AttributeOption & { product_attributes: { id: string; name: string } };
          if (attrOpt && attrOpt.product_attributes) {
            const attrId = attrOpt.product_attributes.id;
            if (!attributesMap.has(attrId)) {
              attributesMap.set(attrId, {
                id: attrId,
                name: attrOpt.product_attributes.name,
                options: []
              });
            }
            const existing = attributesMap.get(attrId)!;
            if (!existing.options.find(o => o.id === attrOpt.id)) {
              existing.options.push(attrOpt);
            }
          }
        }
      }

      const grouped = Array.from(attributesMap.values());
      grouped.forEach(g => g.options.sort((a, b) => a.sort_order - b.sort_order));
      setGroupedAttributes(grouped);

      // Auto-select first options if only one variant
      if (variantsWithOptions.length === 1) {
        const firstVariant = variantsWithOptions[0];
        const initialSelections: Record<string, string> = {};
        firstVariant.options.forEach(opt => {
          initialSelections[opt.attribute_id] = opt.id;
        });
        setSelectedOptions(initialSelections);
        setSelectedVariant(firstVariant);
        onVariantChange(firstVariant, basePrice + firstVariant.price_adjustment);
      }
    } catch (error) {
      console.error('Erro ao carregar variantes:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectOption = (attributeId: string, optionId: string) => {
    const newSelections = { ...selectedOptions, [attributeId]: optionId };
    setSelectedOptions(newSelections);

    // Find matching variant
    const selectedOptionIds = Object.values(newSelections);
    const matchingVariant = variants.find(variant => {
      const variantOptionIds = variant.options.map(o => o.id);
      return selectedOptionIds.every(id => variantOptionIds.includes(id)) &&
             variantOptionIds.length === selectedOptionIds.length;
    });

    setSelectedVariant(matchingVariant || null);
    onVariantChange(
      matchingVariant || null, 
      matchingVariant ? basePrice + matchingVariant.price_adjustment : basePrice
    );
  };

  const isOptionAvailable = (attributeId: string, optionId: string) => {
    // Check if this option is available given current selections
    const otherSelections = { ...selectedOptions };
    delete otherSelections[attributeId];
    
    return variants.some(variant => {
      const variantOptionIds = variant.options.map(o => o.id);
      const hasThisOption = variantOptionIds.includes(optionId);
      const matchesOthers = Object.values(otherSelections).every(id => 
        variantOptionIds.includes(id)
      );
      return hasThisOption && matchesOthers && variant.stock > 0;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-16" />
          <Skeleton className="h-10 w-16" />
          <Skeleton className="h-10 w-16" />
        </div>
      </div>
    );
  }

  if (variants.length === 0 || groupedAttributes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {groupedAttributes.map(attr => (
        <div key={attr.id} className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            {attr.name}
            {selectedOptions[attr.id] && (
              <span className="text-muted-foreground ml-2">
                : {attr.options.find(o => o.id === selectedOptions[attr.id])?.label}
              </span>
            )}
          </label>
          <div className="flex flex-wrap gap-2">
            {attr.options.map(option => {
              const isSelected = selectedOptions[attr.id] === option.id;
              const isAvailable = isOptionAvailable(attr.id, option.id);
              
              return (
                <button
                  key={option.id}
                  onClick={() => selectOption(attr.id, option.id)}
                  disabled={!isAvailable}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : isAvailable
                        ? "border-border hover:border-primary/50 bg-background"
                        : "border-border/50 bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                  )}
                >
                  {option.image_url && (
                    <img 
                      src={option.image_url} 
                      alt={option.label}
                      className="w-5 h-5 rounded object-cover"
                    />
                  )}
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Stock Info */}
      {selectedVariant && (
        <div className="pt-2">
          {selectedVariant.stock > 0 ? (
            <Badge variant="secondary" className="text-xs">
              {selectedVariant.stock} {selectedVariant.stock === 1 ? 'unidade disponível' : 'unidades disponíveis'}
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-xs">
              Indisponível
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
