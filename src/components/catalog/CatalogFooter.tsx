import { Store, MessageCircle } from "lucide-react";

interface CatalogFooterProps {
  storeName?: string;
  whatsappNumber?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

export function CatalogFooter({ storeName, whatsappNumber, primaryColor, secondaryColor }: CatalogFooterProps) {
  const handleWhatsAppClick = () => {
    if (!whatsappNumber) return;
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá${storeName ? `, ${storeName}` : ''}! 👋 Gostaria de mais informações.`);
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  const primary = primaryColor || 'hsl(var(--primary))';
  const secondary = secondaryColor || primary;
  const brandGradient = `linear-gradient(90deg, ${primary}, ${secondary})`;

  return (
    <footer className="mt-12 border-t border-border bg-muted/30">
      {/* Faixa superior com gradiente da marca */}
      <div className="h-1 w-full" style={{ background: brandGradient }} aria-hidden="true" />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-md"
              style={{ background: brandGradient }}
            >
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-foreground">{storeName || 'Catálogo'}</p>
              <p className="text-sm text-muted-foreground">Catálogo Online</p>
            </div>
          </div>

          {whatsappNumber && (
            <button
              onClick={handleWhatsAppClick}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Fale conosco pelo WhatsApp
            </button>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {storeName || 'Catálogo'}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
