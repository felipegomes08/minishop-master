import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WhatsAppButtonProps {
  whatsappNumber?: string | null;
  storeName?: string;
  className?: string;
}

export function WhatsAppButton({ whatsappNumber, storeName, className }: WhatsAppButtonProps) {
  if (!whatsappNumber) return null;

  const handleClick = () => {
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá${storeName ? `, ${storeName}` : ''}! 👋 Gostaria de mais informações sobre os produtos.`);
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  return (
    <Button
      onClick={handleClick}
      size="lg"
      className={cn(
        "fixed bottom-6 right-6 z-50 rounded-full shadow-lg h-14 w-14 p-0",
        "bg-[#25D366] hover:bg-[#128C7E] text-white",
        "animate-bounce hover:animate-none",
        className
      )}
      aria-label="Contato via WhatsApp"
    >
      <MessageCircle className="w-6 h-6" />
    </Button>
  );
}
