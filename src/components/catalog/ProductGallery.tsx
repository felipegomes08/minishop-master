import { useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageZoomModal } from "./ImageZoomModal";

interface ProductGalleryProps {
  images: string[];
  productName: string;
  className?: string;
}

export function ProductGallery({ images, productName, className }: ProductGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const displayImages = images.length > 0 ? images : ["/placeholder.svg"];
  const hasMultipleImages = displayImages.length > 1;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
  };

  const handleImageClick = () => {
    setIsZoomOpen(true);
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Imagem Principal */}
      <div
        className="relative aspect-square overflow-hidden rounded-xl bg-muted group cursor-zoom-in"
        onClick={handleImageClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleImageClick()}
        aria-label="Clique para ampliar a imagem"
      >
        <img
          src={displayImages[currentIndex]}
          alt={`${productName} - Imagem ${currentIndex + 1}`}
          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
        />

        {/* Zoom indicator */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20">
          <div className="bg-black/60 text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium">
            <ZoomIn className="h-4 w-4" />
            <span>Clique para ampliar</span>
          </div>
        </div>

        {hasMultipleImages && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full opacity-80 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full opacity-80 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {/* Miniaturas */}
      {hasMultipleImages && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {displayImages.map((image, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 transition-all",
                index === currentIndex
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border/50 hover:border-border"
              )}
            >
              <img
                src={image}
                alt={`${productName} - Miniatura ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Modal de Zoom */}
      <ImageZoomModal
        images={displayImages}
        currentIndex={currentIndex}
        productName={productName}
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        onIndexChange={setCurrentIndex}
      />
    </div>
  );
}

