import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Camera, 
  ImagePlus, 
  Sparkles, 
  ArrowLeft, 
  Download,
  RefreshCw,
  ShoppingCart,
  AlertCircle,
  Wand2
} from "lucide-react";

interface VirtualTryOnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  productImage: string;
  categoryName?: string;
  onBuyClick: () => void;
}

type Step = 'intro' | 'capture' | 'processing' | 'result';

export function VirtualTryOnDialog({
  open,
  onOpenChange,
  productName,
  productImage,
  categoryName,
  onBuyClick
}: VirtualTryOnDialogProps) {
  const [step, setStep] = useState<Step>('intro');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setStep('intro');
    setUserPhoto(null);
    setGeneratedImage(null);
    setError(null);
    setIsProcessing(false);
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(resetState, 300);
  }, [onOpenChange, resetState]);

  const compressImage = (file: File, maxWidth = 800): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setUserPhoto(compressed);
      setError(null);
    } catch {
      setError('Erro ao processar a imagem. Tente novamente.');
    }
  };

  const handleGenerate = async () => {
    if (!userPhoto) return;

    setStep('processing');
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/virtual-try-on`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userPhoto,
            productImage,
            productName,
            productCategory: categoryName
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar visualização');
      }

      setGeneratedImage(data.generatedImage);
      setStep('result');
    } catch (err) {
      console.error('Erro no virtual try-on:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar visualização');
      setStep('capture');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `experimentar-${productName.replace(/\s+/g, '-').toLowerCase()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTryAgain = () => {
    setUserPhoto(null);
    setGeneratedImage(null);
    setError(null);
    setStep('capture');
  };

  const getTip = () => {
    const cat = (categoryName || '').toLowerCase();
    if (cat.includes('colar') || cat.includes('gargantilha') || cat.includes('corrente')) {
      return 'Para colares, mostre seu pescoço e ombros claramente.';
    }
    if (cat.includes('anel')) {
      return 'Para anéis, mostre sua mão aberta e bem iluminada.';
    }
    if (cat.includes('brinco')) {
      return 'Para brincos, mostre suas orelhas visíveis.';
    }
    if (cat.includes('pulseira') || cat.includes('bracelete')) {
      return 'Para pulseiras, mostre seu pulso claramente.';
    }
    return 'Tire uma foto bem iluminada mostrando onde o produto será usado.';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {/* Step: Intro */}
        {step === 'intro' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Wand2 className="h-5 w-5 text-primary" />
                Experimentar Online
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">
                  Veja como essa peça fica em você!
                </h3>
              </div>

              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-primary">1</span>
                  </div>
                  <p>Tire ou escolha uma foto sua</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-primary">2</span>
                  </div>
                  <p>Nossa IA vai mostrar a peça em você</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-primary">3</span>
                  </div>
                  <p>Visualize e decida se quer comprar!</p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  O resultado é uma simulação gerada por IA. Use como referência para ter uma ideia de como a peça ficaria em você.
                </p>
              </div>

              <Button onClick={() => setStep('capture')} className="w-full" size="lg">
                <Sparkles className="h-4 w-4 mr-2" />
                Começar
              </Button>
            </div>
          </>
        )}

        {/* Step: Capture */}
        {step === 'capture' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep('intro')} className="h-8 w-8 -ml-2">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                Sua Foto
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-primary/5 rounded-lg p-3 flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground">{getTip()}</p>
              </div>

              {/* Preview da foto ou placeholder */}
              <div className="aspect-square rounded-lg border-2 border-dashed border-border bg-muted/30 overflow-hidden flex items-center justify-center">
                {userPhoto ? (
                  <img 
                    src={userPhoto} 
                    alt="Sua foto" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6">
                    <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma foto selecionada
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Botões de captura */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                  className="h-auto py-3 flex-col gap-1"
                >
                  <Camera className="h-5 w-5" />
                  <span className="text-xs">Tirar Foto</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-auto py-3 flex-col gap-1"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-xs">Galeria</span>
                </Button>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={handleFileSelect}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* Botão de gerar */}
              <Button 
                onClick={handleGenerate} 
                disabled={!userPhoto}
                className="w-full"
                size="lg"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Visualização
              </Button>
            </div>
          </>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="py-12 text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">A mágica está acontecendo...</h3>
              <p className="text-sm text-muted-foreground">
                Isso pode levar alguns segundos
              </p>
            </div>
          </div>
        )}

        {/* Step: Result */}
        {step === 'result' && generatedImage && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Resultado
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Comparação lado a lado */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center">Sua foto</p>
                  <div className="aspect-square rounded-lg overflow-hidden border border-border">
                    <img 
                      src={userPhoto!} 
                      alt="Foto original" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center">Com a peça</p>
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-primary">
                    <img 
                      src={generatedImage} 
                      alt="Com o produto" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleTryAgain}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar outra
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDownload}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>

              <Button 
                onClick={() => {
                  handleClose();
                  onBuyClick();
                }}
                className="w-full"
                size="lg"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Comprar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
