import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { CategoryNav } from "@/components/catalog/CategoryNav";
import { ProductCard } from "@/components/catalog/ProductCard";
import { 
  CatalogHeaderSkeleton, 
  CategoryNavSkeleton, 
  ProductGridSkeleton 
} from "@/components/catalog/CatalogSkeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  promotional_price?: number | null;
  images?: string[] | null;
  stock?: number | null;
  category_id?: string | null;
  is_active?: boolean | null;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  parent_id?: string | null;
}

interface StoreSettings {
  store_name: string;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
}

type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc" | "newest";

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("newest");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [productsRes, categoriesRes, settingsRes] = await Promise.all([
      supabase.from("products").select("*").eq("is_active", true),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("store_settings").select("*").maybeSingle()
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (settingsRes.data) {
      setStoreSettings(settingsRes.data);
    } else {
      setStoreSettings({ store_name: "Catálogo" });
    }
    
    setLoading(false);
  };

  // Obter todas as categorias filhas de uma categoria
  const getCategoryWithChildren = (categoryId: string): string[] => {
    const result = [categoryId];
    const children = categories.filter(cat => cat.parent_id === categoryId);
    children.forEach(child => {
      result.push(...getCategoryWithChildren(child.id));
    });
    return result;
  };

  // Filtrar e ordenar produtos
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filtro por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(product => 
        product.name.toLowerCase().includes(query)
      );
    }

    // Filtro por categoria (inclui subcategorias)
    if (selectedCategory) {
      const categoryIds = getCategoryWithChildren(selectedCategory);
      result = result.filter(product => 
        product.category_id && categoryIds.includes(product.category_id)
      );
    }

    // Ordenação
    switch (sortOption) {
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "price-asc":
        result.sort((a, b) => (a.promotional_price || a.price) - (b.promotional_price || b.price));
        break;
      case "price-desc":
        result.sort((a, b) => (b.promotional_price || b.price) - (a.promotional_price || a.price));
        break;
      case "newest":
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    return result;
  }, [products, searchQuery, selectedCategory, sortOption, categories]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CatalogHeaderSkeleton />
        <main className="container mx-auto px-4 py-6 space-y-6">
          <CategoryNavSkeleton />
          <ProductGridSkeleton count={8} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CatalogHeader
        storeName={storeSettings?.store_name || "Catálogo"}
        logoUrl={storeSettings?.logo_url}
        primaryColor={storeSettings?.primary_color}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Navegação por Categorias */}
        {categories.length > 0 && (
          <CategoryNav
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        )}

        {/* Barra de Filtros */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {filteredProducts.length} {filteredProducts.length === 1 ? "produto" : "produtos"}
          </p>
          
          <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Mais recentes</SelectItem>
              <SelectItem value="name-asc">Nome A-Z</SelectItem>
              <SelectItem value="name-desc">Nome Z-A</SelectItem>
              <SelectItem value="price-asc">Menor preço</SelectItem>
              <SelectItem value="price-desc">Maior preço</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grid de Produtos */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                promotionalPrice={product.promotional_price}
                images={product.images}
                stock={product.stock}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              Nenhum produto encontrado
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {searchQuery 
                ? "Tente buscar por outro termo ou remova os filtros aplicados."
                : "Não há produtos disponíveis no momento."
              }
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
