import { cn } from "@/lib/utils";

interface PriceDisplayProps {
  price: number;
  promotionalPrice?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PriceDisplay({ 
  price, 
  promotionalPrice, 
  size = "md",
  className 
}: PriceDisplayProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const hasPromotion = promotionalPrice && promotionalPrice < price;

  const sizeClasses = {
    sm: { current: "text-sm font-semibold", original: "text-xs" },
    md: { current: "text-lg font-bold", original: "text-sm" },
    lg: { current: "text-2xl font-bold", original: "text-base" }
  };

  return (
    <div className={cn("flex flex-col", className)}>
      {hasPromotion ? (
        <>
          <span className={cn("text-muted-foreground line-through", sizeClasses[size].original)}>
            {formatCurrency(price)}
          </span>
          <span className={cn("text-primary", sizeClasses[size].current)}>
            {formatCurrency(promotionalPrice)}
          </span>
        </>
      ) : (
        <span className={cn("text-foreground", sizeClasses[size].current)}>
          {formatCurrency(price)}
        </span>
      )}
    </div>
  );
}
