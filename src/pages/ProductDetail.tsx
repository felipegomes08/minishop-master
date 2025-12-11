import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProductGallery } from "@/components/catalog/ProductGallery";
import { PriceDisplay } from "@/components/catalog/PriceDisplay";
import { ProductCard } from "@/components/catalog/ProductCard";
import { ProductDetailSkeleton } from "@/components/catalog/CatalogSkeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShoppingCart, Package } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  promotional_price?: number | null;
  images?: string[] | null;
  stock?: number | null;
  category_id?: string | null;
  is_active?: boolean | null;
}

interface Category {
  id: string;
  name: string;
}

interface StoreSettings {
  store_name: string;
  logo_url?: string | null;
  primary_color?: string | null;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProduct(id);
    }
  }, [id]);

  const fetchProduct = async (productId: string) => {
    setLoading(true);
    setNotFound(false);

    const [productRes, settingsRes] = await Promise.all([
      supabase.from("products").select("*").eq("id", productId).eq("is_active", true).maybeSingle(),
      supabase.from("store_settings").select("*").maybeSingle()
    ]);

    if (!productRes.data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setProduct(productRes.data);
    if (settingsRes.data) setStoreSettings(settingsRes.data);

    // Buscar categoria
    if (productRes.data.category_id) {
      const categoryRes = await supabase
        .from("categories")
        .select("*")
        .eq("id", productRes.data.category_id)
        .maybeSingle();
      
      if (categoryRes.data) setCategory(categoryRes.data);

      // Buscar produtos relacionados (mesma categoria)
      const relatedRes = await supabase
        .from("products")
        .select("*")
        .eq("category_id", productRes.data.category_id)
        .eq("is_active", true)
        .neq("id", productId)
        .limit(4);

      if (relatedRes.data) setRelatedProducts(relatedRes.data);
    }

    setLoading(false);
  };

  const handleBuyClick = () => {
    // Ação futura: redirecionar para WhatsApp
    console.log("Comprar produto:", product?.name);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2">Produto não encontrado</h1>
        <p className="text-muted-foreground mb-6 text-center">
          O produto que você está procurando não existe ou não está mais disponível.
        </p>
        <Link to="/catalogo">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao catálogo
          </Button>
        </Link>
      </div>
    );
  }

  const isOutOfStock = product.stock !== null && product.stock !== undefined && product.stock <= 0;
  const images = product.images || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header Simples */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link to="/catalogo">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/catalogo" className="flex items-center gap-2">
              {storeSettings?.logo_url ? (
                <img 
                  src={storeSettings.logo_url} 
                  alt={storeSettings.store_name} 
                  className="h-8 w-8 rounded-lg object-contain"
                />
              ) : null}
              <span className="font-semibold text-foreground">
                {storeSettings?.store_name || "Catálogo"}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="container mx-auto px-4 py-6 lg:py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Galeria de Imagens */}
          <ProductGallery images={images} productName={product.name} />

          {/* Informações do Produto */}
          <div className="space-y-6">
            {/* Categoria */}
            {category && (
              <Badge variant="secondary" className="text-xs">
                {category.name}
              </Badge>
            )}

            {/* Nome */}
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              {product.name}
            </h1>

            {/* Preço */}
            <PriceDisplay 
              price={product.price} 
              promotionalPrice={product.promotional_price} 
              size="lg"
            />

            {/* Disponibilidade */}
            {isOutOfStock ? (
              <Badge variant="destructive">Produto indisponível</Badge>
            ) : product.stock !== null && product.stock !== undefined ? (
              <p className="text-sm text-muted-foreground">
                {product.stock} {product.stock === 1 ? "unidade disponível" : "unidades disponíveis"}
              </p>
            ) : null}

            {/* Descrição */}
            {product.description && (
              <div className="prose prose-sm max-w-none">
                <h3 className="text-sm font-medium text-foreground mb-2">Descrição</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            )}

            {/* Botão Comprar */}
            <Button 
              size="lg" 
              className="w-full"
              disabled={isOutOfStock}
              onClick={handleBuyClick}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              {isOutOfStock ? "Indisponível" : "Comprar"}
            </Button>
          </div>
        </div>

        {/* Produtos Relacionados */}
        {relatedProducts.length > 0 && (
          <section className="mt-12 lg:mt-16">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Produtos relacionados
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((relProduct) => (
                <ProductCard
                  key={relProduct.id}
                  id={relProduct.id}
                  name={relProduct.name}
                  price={relProduct.price}
                  promotionalPrice={relProduct.promotional_price}
                  images={relProduct.images}
                  stock={relProduct.stock}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
