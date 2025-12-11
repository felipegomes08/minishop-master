import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CatalogHeaderProps {
  storeName: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  className?: string;
}

export function CatalogHeader({
  storeName,
  logoUrl,
  primaryColor,
  searchQuery,
  onSearchChange,
  className
}: CatalogHeaderProps) {
  return (
    <header 
      className={cn(
        "sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
      style={primaryColor ? { '--header-accent': primaryColor } as React.CSSProperties : undefined}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Logo e Nome */}
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={storeName} 
                className="h-10 w-10 rounded-lg object-contain"
              />
            ) : (
              <div 
                className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center"
                style={primaryColor ? { backgroundColor: primaryColor } : undefined}
              >
                <span className="text-primary-foreground font-bold text-lg">
                  {storeName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <h1 className="text-xl font-bold text-foreground">
              {storeName}
            </h1>
          </div>

          {/* Campo de Busca */}
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar produtos..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-muted/50 border-border/50 focus:bg-background"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
