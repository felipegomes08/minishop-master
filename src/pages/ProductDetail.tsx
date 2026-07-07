import { ProductDetailSkeleton } from "@/components/catalog/CatalogSkeleton";
import { PriceDisplay } from "@/components/catalog/PriceDisplay";
import { ProductCard } from "@/components/catalog/ProductCard";
import { ProductGallery } from "@/components/catalog/ProductGallery";
import { VariantSelector } from "@/components/catalog/VariantSelector";
import { VirtualTryOnDialog } from "@/components/catalog/VirtualTryOnDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { buildBrandCssVars } from "@/lib/colorUtils";
import { ArrowLeft, Package, ShoppingCart, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
  company_id?: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  whatsapp_number: string | null;
}

export default function ProductDetail() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tryOnOpen, setTryOnOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<{ options: { label: string }[] } | null>(null);
  const [displayPrice, setDisplayPrice] = useState(0);
  const { planTier } = useSubscription();
  const allowed = planTier === 'prata' || planTier === 'ouro';

  useEffect(() => {
    window.scrollTo(0, 0);
    if (id && slug) {
      fetchProduct(id, slug);
    }
  }, [id, slug]);

  const fetchProduct = async (productId: string, companySlug: string) => {
    setLoading(true);
    setNotFound(false);

    // First get the company
    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("slug", companySlug)
      .eq("is_active", true)
      .maybeSingle();
    
    if (companyError || !companyData) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    
    setCompany(companyData);

    // Then get the product (ensuring it belongs to this company)
    const { data: productData } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("is_active", true)
      .eq("company_id", companyData.id)
      .maybeSingle();

    if (!productData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setProduct(productData);

    // Buscar categoria
    if (productData.category_id) {
      const categoryRes = await supabase
        .from("categories")
        .select("*")
        .eq("id", productData.category_id)
        .maybeSingle();
      
      if (categoryRes.data) setCategory(categoryRes.data);

      // Buscar produtos relacionados (mesma categoria e empresa)
      const relatedRes = await supabase
        .from("products")
        .select("*")
        .eq("category_id", productData.category_id)
        .eq("company_id", companyData.id)
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
    
    const whatsappNumber = company?.whatsapp_number?.replace(/\D/g, '');
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

    const productUrl = `${window.location.origin}/catalogo/${slug}/produto/${product.id}`;
    
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
        <Link to={`/catalogo/${slug}`}>
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

  const brandStyle = buildBrandCssVars(company?.primary_color, company?.secondary_color);
  const primaryColor = company?.primary_color || 'hsl(var(--primary))';
  const secondaryColor = company?.secondary_color || primaryColor;
  const brandGradient = `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`;

  return (
    <div className="min-h-screen bg-background" style={brandStyle}>
      {/* Header Simples */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link to={`/catalogo/${slug}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Link to={`/catalogo/${slug}`} className="flex items-center gap-2">
              {company?.logo_url ? (
                <img 
                  src={company.logo_url} 
                  alt={company.name} 
                  className="h-8 w-8 rounded-lg object-contain"
                />
              ) : null}
              <span className="font-semibold text-foreground">
                {company?.name || "Catálogo"}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Faixa de acento com cores da marca */}
      <div className="h-1 w-full" style={{ background: brandGradient }} aria-hidden="true" />

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
              {(hasImages && allowed) && (
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
                  companySlug={slug}
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
