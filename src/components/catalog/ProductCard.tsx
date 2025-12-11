import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PriceDisplay } from "./PriceDisplay";
import { cn } from "@/lib/utils";

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
  className
}: ProductCardProps) {
  const hasPromotion = promotionalPrice && promotionalPrice < price;
  const isOutOfStock = stock !== null && stock !== undefined && stock <= 0;
  const imageUrl = images && images.length > 0 ? images[0] : "/placeholder.svg";

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
          {hasPromotion && (
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
        <CardContent className="p-4">
          <h3 className="font-medium text-foreground line-clamp-2 min-h-[2.5rem] mb-1 group-hover:text-primary transition-colors">
            {name}
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
              {description}
            </p>
          )}
          <PriceDisplay price={price} promotionalPrice={promotionalPrice} size="md" />
        </CardContent>
      </Card>
    </Link>
  );
}
