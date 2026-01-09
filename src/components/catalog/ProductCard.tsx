import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PriceDisplay } from "./PriceDisplay";
import { cn } from "@/lib/utils";

interface VariantOption {
  id: string;
  label: string;
  image_url: string | null;
  attribute_name: string;
}

interface ProductVariant {
  id: string;
  product_id: string;
  price_adjustment: number;
  stock: number;
  is_active: boolean;
  options: VariantOption[];
}

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  promotionalPrice?: number | null;
  images?: string[] | null;
  stock?: number | null;
  description?: string | null;
  categoryName?: string | null;
  className?: string;
  variants?: ProductVariant[];
}

export function ProductCard({
  id,
  name,
  price,
  promotionalPrice,
  images,
  stock,
  description,
  categoryName,
  className,
  variants = []
}: ProductCardProps) {
  const hasPromotion = promotionalPrice && promotionalPrice < price;
  const imageUrl = images && images.length > 0 ? images[0] : "/placeholder.svg";

  // Calculate price range if variants exist
  const hasVariants = variants.length > 0;
  let minPrice = price;
  let maxPrice = price;
  let totalStock = stock ?? 0;
  
  if (hasVariants) {
    const variantPrices = variants.map(v => price + (v.price_adjustment || 0));
    minPrice = Math.min(...variantPrices);
    maxPrice = Math.max(...variantPrices);
    totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  }

  const isOutOfStock = hasVariants ? totalStock <= 0 : (stock !== null && stock !== undefined && stock <= 0);

  // Get unique options grouped by attribute for display (colors, sizes, etc.)
  const getUniqueOptionsByAttribute = () => {
    const attributeMap = new Map<string, VariantOption[]>();
    
    variants.forEach(variant => {
      variant.options.forEach(option => {
        if (!attributeMap.has(option.attribute_name)) {
          attributeMap.set(option.attribute_name, []);
        }
        const existing = attributeMap.get(option.attribute_name)!;
        if (!existing.find(o => o.id === option.id)) {
          existing.push(option);
        }
      });
    });
    
    return attributeMap;
  };

  const optionsByAttribute = hasVariants ? getUniqueOptionsByAttribute() : new Map();

  return (
    <Link to={`/catalogo/produto/${id}`}>
      <Card className={cn(
        "group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50 h-full",
        isOutOfStock && "opacity-70",
        className
      )}>
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {categoryName && (
            <Badge 
              variant="secondary" 
              className="absolute top-2 right-2 bg-background/90 text-foreground text-xs"
            >
              {categoryName}
            </Badge>
          )}
          {hasPromotion && !hasVariants && (
            <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground">
              Promoção
            </Badge>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Badge variant="secondary" className="text-sm">
                Indisponível
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-4 space-y-2">
          <h3 className="font-medium text-foreground line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
            {name}
          </h3>
          
          {description && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {description}
            </p>
          )}

          {/* Variant options display */}
          {hasVariants && (
            <div className="space-y-1.5">
              {Array.from(optionsByAttribute.entries()).map(([attrName, options]) => (
                <div key={attrName} className="flex items-center gap-1 flex-wrap">
                  {options.slice(0, 5).map(option => (
                    option.image_url ? (
                      <div
                        key={option.id}
                        className="w-5 h-5 rounded-full border border-border overflow-hidden"
                        title={option.label}
                      >
                        <img 
                          src={option.image_url} 
                          alt={option.label}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <Badge 
                        key={option.id} 
                        variant="outline" 
                        className="text-[10px] px-1.5 py-0"
                      >
                        {option.label}
                      </Badge>
                    )
                  ))}
                  {options.length > 5 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{options.length - 5}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Price display */}
          {hasVariants && minPrice !== maxPrice ? (
            <div className="text-sm">
              <span className="text-muted-foreground">A partir de </span>
              <span className="font-semibold text-primary">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(minPrice)}
              </span>
            </div>
          ) : (
            <PriceDisplay price={price} promotionalPrice={promotionalPrice} size="md" />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
