import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { CategoryNav } from "@/components/catalog/CategoryNav";
import { ProductCard } from "@/components/catalog/ProductCard";
import { WhatsAppButton } from "@/components/catalog/WhatsAppButton";
import { CatalogFooter } from "@/components/catalog/CatalogFooter";
import { 
  CatalogHeaderSkeleton, 
  CategoryNavSkeleton, 
  ProductGridSkeleton 
} from "@/components/catalog/CatalogSkeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, ShoppingBag, ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback } from "react";

interface ProductVariant {
  id: string;
  product_id: string;
  price_adjustment: number;
  stock: number;
  is_active: boolean;
  options: {
    id: string;
    label: string;
    image_url: string | null;
    attribute_name: string;
  }[];
}

interface Product {
  id: string;
  name: string;
  price: number;
  promotional_price?: number | null;
  images?: string[] | null;
  stock?: number | null;
  category_id?: string | null;
  is_active?: boolean | null;
  description?: string | null;
  created_at: string;
  variants?: ProductVariant[];
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
  whatsapp_number?: string | null;
}

interface Banner {
  id: string;
  image_url: string;
  title: string | null;
  link: string | null;
}

type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc" | "newest";

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("newest");

  // Carousel
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    
    // Auto-play
    const autoplay = setInterval(() => {
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
      } else {
        emblaApi.scrollTo(0);
      }
    }, 5000);

    return () => {
      clearInterval(autoplay);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [productsRes, categoriesRes, settingsRes, bannersRes, variantsRes, variantOptionsRes, attributesRes] = await Promise.all([
      supabase.from("products").select("*").eq("is_active", true),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("store_settings").select("*").maybeSingle(),
      supabase.from("banners").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("product_variants").select("*").eq("is_active", true),
      supabase.from("product_variant_options").select("*, attribute_options(*)"),
      supabase.from("product_attributes").select("*").eq("is_active", true)
    ]);

    // Build variants with options
    const variantsWithOptions: ProductVariant[] = (variantsRes.data || []).map(variant => {
      const options = (variantOptionsRes.data || [])
        .filter(vo => vo.variant_id === variant.id)
        .map(vo => {
          const attr = (attributesRes.data || []).find(a => a.id === vo.attribute_options?.attribute_id);
          return {
            id: vo.attribute_options?.id || '',
            label: vo.attribute_options?.label || '',
            image_url: vo.attribute_options?.image_url || null,
            attribute_name: attr?.name || ''
          };
        });
      return { ...variant, options };
    });

    // Attach variants to products
    const productsWithVariants = (productsRes.data || []).map(product => ({
      ...product,
      variants: variantsWithOptions.filter(v => v.product_id === product.id)
    }));

    setProducts(productsWithVariants);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (settingsRes.data) {
      setStoreSettings(settingsRes.data);
    } else {
      setStoreSettings({ store_name: "Catálogo" });
    }
    if (bannersRes.data) setBanners(bannersRes.data);
    
    setLoading(false);
  };

  const getCategoryName = (categoryId: string | null | undefined) => {
    if (!categoryId) return null;
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || null;
  };

  const getCategoryWithChildren = (categoryId: string): string[] => {
    const result = [categoryId];
    const children = categories.filter(cat => cat.parent_id === categoryId);
    children.forEach(child => {
      result.push(...getCategoryWithChildren(child.id));
    });
    return result;
  };

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      );
    }

    if (selectedCategory) {
      const categoryIds = getCategoryWithChildren(selectedCategory);
      result = result.filter(product => 
        product.category_id && categoryIds.includes(product.category_id)
      );
    }

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
    <div className="min-h-screen bg-background flex flex-col">
      <CatalogHeader
        storeName={storeSettings?.store_name || "Catálogo"}
        logoUrl={storeSettings?.logo_url}
        primaryColor={storeSettings?.primary_color}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Banner Carousel ou Hero padrão */}
      {banners.length > 0 ? (
        <div className="relative w-full">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {banners.map((banner) => (
                <div 
                  key={banner.id} 
                  className="flex-[0_0_100%] min-w-0"
                >
                  {banner.link ? (
                    <a href={banner.link} target="_blank" rel="noopener noreferrer">
                      <img 
                        src={banner.image_url} 
                        alt={banner.title || 'Banner'} 
                        className="w-full h-[200px] md:h-[300px] lg:h-[400px] object-cover"
                      />
                    </a>
                  ) : (
                    <img 
                      src={banner.image_url} 
                      alt={banner.title || 'Banner'} 
                      className="w-full h-[200px] md:h-[300px] lg:h-[400px] object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Navigation buttons */}
          {banners.length > 1 && (
            <>
              <button
                onClick={scrollPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 flex items-center justify-center shadow-lg hover:bg-background transition-colors"
                disabled={!canScrollPrev}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={scrollNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 flex items-center justify-center shadow-lg hover:bg-background transition-colors"
                disabled={!canScrollNext}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              
              {/* Dots indicator */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => emblaApi?.scrollTo(idx)}
                    className="w-2 h-2 rounded-full bg-white/50 hover:bg-white/80 transition-colors"
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        /* Hero Banner padrão */
        <div 
          className="w-full py-8 px-4"
          style={{ 
            background: `linear-gradient(135deg, ${storeSettings?.primary_color || 'hsl(var(--primary))'}, ${storeSettings?.secondary_color || 'hsl(var(--primary))'})` 
          }}
        >
          <div className="container mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ShoppingBag className="w-6 h-6 text-white/90" />
              <span className="text-white/90 text-sm font-medium">Catálogo Online</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Bem-vindo à {storeSettings?.store_name || "nossa loja"}!
            </h1>
            <p className="text-white/80 text-sm md:text-base">
              Explore nossa coleção exclusiva de produtos
            </p>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-6 space-y-6 flex-1">
        {categories.length > 0 && (
          <CategoryNav
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        )}

        <div className="flex items-center justify-between gap-4 py-2 px-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{filteredProducts.length}</span> {filteredProducts.length === 1 ? "produto" : "produtos"}
          </p>
          
          <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
            <SelectTrigger className="w-[180px] bg-background">
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

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 animate-fade-in">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                promotionalPrice={product.promotional_price}
                images={product.images}
                stock={product.stock}
                description={product.description}
                categoryName={getCategoryName(product.category_id)}
                variants={product.variants}
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

      <CatalogFooter 
        storeName={storeSettings?.store_name}
        whatsappNumber={storeSettings?.whatsapp_number}
        primaryColor={storeSettings?.primary_color}
      />

      <WhatsAppButton 
        whatsappNumber={storeSettings?.whatsapp_number}
        storeName={storeSettings?.store_name}
      />
    </div>
  );
}