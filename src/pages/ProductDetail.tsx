import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProductGallery } from "@/components/catalog/ProductGallery";
import { PriceDisplay } from "@/components/catalog/PriceDisplay";
import { ProductCard } from "@/components/catalog/ProductCard";
import { ProductDetailSkeleton } from "@/components/catalog/CatalogSkeleton";
import { VirtualTryOnDialog } from "@/components/catalog/VirtualTryOnDialog";
import { VariantSelector } from "@/components/catalog/VariantSelector";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShoppingCart, Package, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
  whatsapp_number?: string | null;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tryOnOpen, setTryOnOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<{ options: { label: string }[] } | null>(null);
  const [displayPrice, setDisplayPrice] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
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

  const handleVariantChange = (variant: { options: { label: string }[] } | null, finalPrice: number) => {
    setSelectedVariant(variant);
    setDisplayPrice(finalPrice);
  };

  const handleBuyClick = () => {
    if (!product) return;
    
    const whatsappNumber = storeSettings?.whatsapp_number?.replace(/\D/g, '');
    if (!whatsappNumber) {
      toast.error("WhatsApp não configurado", {
        description: "A loja ainda não configurou o número de WhatsApp."
      });
      return;
    }

    const price = displayPrice || product.promotional_price || product.price;
    const formattedPrice = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);

    const productUrl = `${window.location.origin}/catalogo/produto/${product.id}`;
    
    // Include variant info if selected
    const variantInfo = selectedVariant?.options?.length 
      ? `\n📦 Variante: ${selectedVariant.options.map(o => o.label).join(', ')}`
      : '';
    
    const message = `Olá! 👋

Tenho interesse neste produto:

*${product.name}*${variantInfo}
💰 Preço: ${formattedPrice}

📎 Link: ${productUrl}

Poderia me dar mais informações?`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
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
  const hasImages = images.length > 0;

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
              price={displayPrice || product.promotional_price || product.price} 
              promotionalPrice={displayPrice ? undefined : product.promotional_price} 
              size="lg"
            />

            {/* Seletor de Variantes */}
            <VariantSelector
              productId={product.id}
              basePrice={product.promotional_price || product.price}
              onVariantChange={handleVariantChange}
            />

            {/* Disponibilidade (only show if no variants) */}
            {!selectedVariant && isOutOfStock ? (
              <Badge variant="destructive">Produto indisponível</Badge>
            ) : !selectedVariant && product.stock !== null && product.stock !== undefined ? (
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

            {/* Botões de Ação */}
            <div className="space-y-3">
              {hasImages && (
                <Button 
                  variant="outline"
                  size="lg" 
                  className="w-full"
                  onClick={() => setTryOnOpen(true)}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Experimentar Online
                </Button>
              )}
              
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

      {/* Virtual Try-On Dialog */}
      {hasImages && (
        <VirtualTryOnDialog
          open={tryOnOpen}
          onOpenChange={setTryOnOpen}
          productName={product.name}
          productImage={images[0]}
          categoryName={category?.name}
          onBuyClick={handleBuyClick}
        />
      )}
    </div>
  );
}
