import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-square" />
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-6 w-1/2" />
      </CardContent>
    </Card>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategoryNavSkeleton() {
  return (
    <div className="flex gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-20 rounded-md" />
      ))}
    </div>
  );
}

export function CatalogHeaderSkeleton() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-10 w-full sm:max-w-sm" />
        </div>
      </div>
    </header>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <Skeleton className="aspect-square rounded-xl" />
        <div className="space-y-6">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-10 w-1/3" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
