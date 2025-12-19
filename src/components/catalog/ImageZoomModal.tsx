import { useState, useRef, useEffect, useCallback, TouchEvent, MouseEvent, WheelEvent } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageZoomModalProps {
  images: string[];
  currentIndex: number;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export function ImageZoomModal({
  images,
  currentIndex,
  productName,
  isOpen,
  onClose,
  onIndexChange,
}: ImageZoomModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [doubleTapTimer, setDoubleTapTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const MIN_SCALE = 1;
  const MAX_SCALE = 4;
  const ZOOM_STEP = 0.5;

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + ZOOM_STEP, MAX_SCALE));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => {
      const newScale = Math.max(prev - ZOOM_STEP, MIN_SCALE);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  }, []);

  const goToPrevious = useCallback(() => {
    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    onIndexChange(newIndex);
  }, [currentIndex, images.length, onIndexChange]);

  const goToNext = useCallback(() => {
    const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
    onIndexChange(newIndex);
  }, [currentIndex, images.length, onIndexChange]);

  // Reset zoom when image changes or modal opens/closes
  useEffect(() => {
    resetZoom();
  }, [currentIndex, isOpen, resetZoom]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case "+":
        case "=":
          zoomIn();
          break;
        case "-":
          zoomOut();
          break;
        case "0":
          resetZoom();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, goToPrevious, goToNext, zoomIn, zoomOut, resetZoom]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);



  // Calculate distance between two touch points
  const getTouchDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle touch start (for pinch zoom and pan)
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      // Pinch gesture start
      setLastTouchDistance(getTouchDistance(e.touches));
    } else if (e.touches.length === 1) {
      // Check for double tap
      if (doubleTapTimer) {
        clearTimeout(doubleTapTimer);
        setDoubleTapTimer(null);
        // Double tap detected - toggle zoom
        if (scale > 1) {
          resetZoom();
        } else {
          setScale(2.5);
        }
      } else {
        const timer = setTimeout(() => {
          setDoubleTapTimer(null);
        }, 300);
        setDoubleTapTimer(timer);
      }

      // Start drag if zoomed
      if (scale > 1) {
        setIsDragging(true);
        setDragStart({
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        });
      }
    }
  };

  // Handle touch move (for pinch zoom and pan)
  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && lastTouchDistance !== null) {
      // Pinch gesture
      const currentDistance = getTouchDistance(e.touches);
      const delta = currentDistance - lastTouchDistance;
      const zoomDelta = delta * 0.01;
      
      setScale((prev) => Math.max(MIN_SCALE, Math.min(prev + zoomDelta, MAX_SCALE)));
      setLastTouchDistance(currentDistance);
      e.preventDefault();
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Pan while zoomed
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      
      // Calculate bounds
      const bounds = calculateBounds();
      setPosition({
        x: Math.max(-bounds.x, Math.min(bounds.x, newX)),
        y: Math.max(-bounds.y, Math.min(bounds.y, newY)),
      });
      e.preventDefault();
    }
  };

  // Handle touch end
  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastTouchDistance(null);
    
    // Reset position if zoomed out
    if (scale <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  // Handle mouse wheel zoom
  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    const newScale = Math.max(MIN_SCALE, Math.min(scale + delta, MAX_SCALE));
    setScale(newScale);
    
    if (newScale <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  // Handle mouse drag for panning
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging || scale <= 1) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    const bounds = calculateBounds();
    setPosition({
      x: Math.max(-bounds.x, Math.min(bounds.x, newX)),
      y: Math.max(-bounds.y, Math.min(bounds.y, newY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Calculate pan bounds based on zoom level
  const calculateBounds = () => {
    if (!containerRef.current || !imageRef.current) {
      return { x: 0, y: 0 };
    }
    
    const container = containerRef.current.getBoundingClientRect();
    const scaledWidth = container.width * scale;
    const scaledHeight = container.height * scale;
    
    return {
      x: Math.max(0, (scaledWidth - container.width) / 2),
      y: Math.max(0, (scaledHeight - container.height) / 2),
    };
  };

  // Handle double click on desktop
  const handleDoubleClick = () => {
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2.5);
    }
  };

  if (!isOpen) return null;

  const hasMultipleImages = images.length > 1;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`Visualização ampliada de ${productName}`}
    >
      {/* Header */}
      <header className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/50 to-transparent absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center gap-2">
          {hasMultipleImages && (
            <span className="text-white/80 text-sm font-medium bg-black/30 px-2 py-1 rounded-full">
              {currentIndex + 1} / {images.length}
            </span>
          )}
        </div>
        
        {/* Desktop zoom controls */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={zoomOut}
            disabled={scale <= MIN_SCALE}
            title="Diminuir zoom"
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
          <span className="text-white/80 text-sm min-w-[60px] text-center font-medium">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={zoomIn}
            disabled={scale >= MAX_SCALE}
            title="Aumentar zoom"
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={resetZoom}
            disabled={scale === 1}
            title="Resetar zoom"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={onClose}
          title="Fechar"
        >
          <X className="h-6 w-6" />
        </Button>
      </header>

      {/* Image Container */}
      <div
        ref={containerRef}
        className={cn(
          "flex-1 flex items-center justify-center overflow-hidden touch-none select-none",
          isDragging ? "cursor-grabbing" : scale > 1 ? "cursor-grab" : "cursor-zoom-in"
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <img
          ref={imageRef}
          src={images[currentIndex]}
          alt={`${productName} - Imagem ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain transition-transform duration-150"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          }}
          draggable={false}
        />
      </div>

      {/* Navigation Arrows */}
      {hasMultipleImages && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12 rounded-full bg-black/30"
            onClick={goToPrevious}
            title="Imagem anterior"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12 rounded-full bg-black/30"
            onClick={goToNext}
            title="Próxima imagem"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </>
      )}

      {/* Mobile Zoom Hint */}
      <div className="sm:hidden absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
        <div className="bg-black/50 text-white/70 text-xs px-3 py-2 rounded-full flex items-center gap-2">
          <ZoomIn className="h-4 w-4" />
          <span>Duplo toque para zoom • Dois dedos para ampliar</span>
        </div>
      </div>

      {/* Thumbnail Strip */}
      {hasMultipleImages && (
        <div className="absolute bottom-12 sm:bottom-4 left-0 right-0 flex justify-center px-4">
          <div className="flex gap-2 p-2 bg-black/50 rounded-xl overflow-x-auto max-w-full">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => onIndexChange(index)}
                className={cn(
                  "shrink-0 h-12 w-12 sm:h-16 sm:w-16 rounded-lg overflow-hidden border-2 transition-all",
                  index === currentIndex
                    ? "border-white ring-2 ring-white/30"
                    : "border-white/30 hover:border-white/60 opacity-60 hover:opacity-100"
                )}
              >
                <img
                  src={image}
                  alt={`Miniatura ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
