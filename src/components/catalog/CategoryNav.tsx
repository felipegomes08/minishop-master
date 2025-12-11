import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ChevronRight } from "lucide-react";

interface Category {
  id: string;
  name: string;
  parent_id?: string | null;
}

interface CategoryNavProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  className?: string;
}

export function CategoryNav({
  categories,
  selectedCategory,
  onSelectCategory,
  className
}: CategoryNavProps) {
  // Filtrar apenas categorias de nível superior (sem parent_id)
  const rootCategories = categories.filter(cat => !cat.parent_id);
  
  // Encontrar subcategorias da categoria selecionada
  const getSubcategories = (parentId: string | null) => {
    if (!parentId) return [];
    return categories.filter(cat => cat.parent_id === parentId);
  };

  // Verificar se a categoria selecionada é raiz ou subcategoria
  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);
  const isSelectedRoot = selectedCategoryData && !selectedCategoryData.parent_id;
  const parentCategoryId = isSelectedRoot ? selectedCategory : selectedCategoryData?.parent_id;
  
  const subcategories = parentCategoryId ? getSubcategories(parentCategoryId) : [];
  
  // Encontrar a categoria raiz ativa
  const activeRootCategory = isSelectedRoot 
    ? selectedCategory 
    : selectedCategoryData?.parent_id || null;

  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* Categorias Raiz */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectCategory(null)}
            className="shrink-0"
          >
            Todos
          </Button>
          {rootCategories.map((category) => {
            const isActive = activeRootCategory === category.id;
            const hasChildren = categories.some(cat => cat.parent_id === category.id);
            
            return (
              <Button
                key={category.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => onSelectCategory(category.id)}
                className={cn("shrink-0 gap-1", isActive && hasChildren && "pr-2")}
              >
                {category.name}
                {hasChildren && isActive && (
                  <ChevronRight className="w-3 h-3" />
                )}
              </Button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      
      {/* Subcategorias */}
      {subcategories.length > 0 && (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2 pl-4 border-l-2 border-primary/30">
            <Button
              variant={selectedCategory === parentCategoryId ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onSelectCategory(parentCategoryId)}
              className="shrink-0 text-xs h-7"
            >
              Todos
            </Button>
            {subcategories.map((subcategory) => (
              <Button
                key={subcategory.id}
                variant={selectedCategory === subcategory.id ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onSelectCategory(subcategory.id)}
                className="shrink-0 text-xs h-7"
              >
                {subcategory.name}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
}
