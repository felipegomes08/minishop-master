import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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

  return (
    <div className={cn("w-full", className)}>
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
          {rootCategories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectCategory(category.id)}
              className="shrink-0"
            >
              {category.name}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
