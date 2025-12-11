import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Camera, 
  Upload, 
  Loader2, 
  X, 
  Check, 
  Link2, 
  Plus,
  AlertCircle,
  FileImage,
  Percent
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
}

interface SimilarProduct {
  id: string;
  name: string;
  price: number;
  stock: number | null;
  similarity: number;
}

interface ExtractedProduct {
  name: string;
  quantity: number;
  unitPrice: number;
  description?: string;
  similarProducts: SimilarProduct[];
  // User choices
  action: 'create' | 'link';
  linkedProductId?: string;
  linkedProductName?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onSuccess: () => void;
}

export function ImportFromPhotoDialog({ open, onOpenChange, categories, onSuccess }: Props) {
  const [step, setStep] = useState<'capture' | 'processing' | 'preview' | 'saving'>('capture');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedProducts, setExtractedProducts] = useState<ExtractedProduct[]>([]);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string>('');
  const [profitMargin, setProfitMargin] = useState<string>('30');
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('capture');
    setImagePreview(null);
    setExtractedProducts([]);
    setDefaultCategoryId('');
    setProfitMargin('30');
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      await processImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (imageBase64: string) => {
    setStep('processing');
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('extract-products-from-image', {
        body: { imageBase64 }
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      const products: ExtractedProduct[] = data.products.map((p: any) => ({
        ...p,
        action: p.similarProducts?.length > 0 ? 'link' : 'create',
        linkedProductId: p.similarProducts?.[0]?.id,
        linkedProductName: p.similarProducts?.[0]?.name
      }));

      setExtractedProducts(products);
      setStep('preview');
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      setError(err instanceof Error ? err.message : 'Erro ao processar imagem');
      setStep('capture');
    }
  };

  const updateProduct = (index: number, updates: Partial<ExtractedProduct>) => {
    setExtractedProducts(prev => prev.map((p, i) => 
      i === index ? { ...p, ...updates } : p
    ));
  };

  const removeProduct = (index: number) => {
    setExtractedProducts(prev => prev.filter((_, i) => i !== index));
  };

  const setProductAction = (index: number, action: 'create' | 'link', linkedProduct?: SimilarProduct) => {
    updateProduct(index, {
      action,
      linkedProductId: linkedProduct?.id,
      linkedProductName: linkedProduct?.name
    });
  };

  const handleConfirmImport = async () => {
    if (extractedProducts.length === 0) {
      toast({ title: 'Nenhum produto para importar', variant: 'destructive' });
      return;
    }

    setStep('saving');

    try {
      const toCreate = extractedProducts.filter(p => p.action === 'create');
      const toUpdate = extractedProducts.filter(p => p.action === 'link' && p.linkedProductId);

      // Create new products
      if (toCreate.length > 0) {
        const margin = parseFloat(profitMargin) || 0;
        const newProducts = toCreate.map(p => {
          const salePrice = p.unitPrice * (1 + margin / 100);
          return {
            name: p.name,
            description: p.description || null,
            cost_price: p.unitPrice,
            price: Math.round(salePrice * 100) / 100, // Round to 2 decimal places
            stock: p.quantity,
            category_id: defaultCategoryId || null,
            is_active: true,
            images: []
          };
        });

        const { error: insertError } = await supabase
          .from('products')
          .insert(newProducts);

        if (insertError) throw insertError;
      }

      // Update stock for existing products
      for (const product of toUpdate) {
        if (!product.linkedProductId) continue;

        // Get current stock
        const { data: existing } = await supabase
          .from('products')
          .select('stock')
          .eq('id', product.linkedProductId)
          .single();

        const currentStock = existing?.stock || 0;
        const newStock = currentStock + product.quantity;

        const { error: updateError } = await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', product.linkedProductId);

        if (updateError) throw updateError;
      }

      toast({ 
        title: 'Importação concluída!',
        description: `${toCreate.length} produtos criados, ${toUpdate.length} estoques atualizados`
      });

      handleClose();
      onSuccess();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast({ title: 'Erro ao salvar produtos', variant: 'destructive' });
      setStep('preview');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const newProductsCount = extractedProducts.filter(p => p.action === 'create').length;
  const updateProductsCount = extractedProducts.filter(p => p.action === 'link').length;
  
  const calculateSalePrice = (costPrice: number) => {
    const margin = parseFloat(profitMargin) || 0;
    return Math.round(costPrice * (1 + margin / 100) * 100) / 100;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "max-h-[90vh] overflow-y-auto",
        step === 'preview' ? "max-w-4xl" : "max-w-lg"
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileImage className="w-5 h-5" />
            Importar Produtos da Nota
          </DialogTitle>
        </DialogHeader>

        {/* Step: Capture */}
        {step === 'capture' && (
          <div className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {imagePreview ? (
              <div className="relative">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-full max-h-64 object-contain rounded-lg border border-border"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => setImagePreview(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors"
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm font-medium">Selecionar Arquivo</span>
                </button>
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors"
                >
                  <Camera className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm font-medium">Tirar Foto</span>
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            <p className="text-sm text-muted-foreground text-center">
              Selecione ou tire uma foto de uma nota fiscal ou lista de produtos.
              A IA irá extrair os itens automaticamente.
            </p>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-accent" />
            <p className="text-lg font-medium">Analisando nota...</p>
            <p className="text-sm text-muted-foreground">
              A IA está extraindo os produtos da imagem
            </p>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <span className="text-sm">
                <strong>{extractedProducts.length}</strong> produtos encontrados
              </span>
              <div className="flex gap-2 text-sm">
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  <Plus className="w-3 h-3 mr-1" />
                  {newProductsCount} novos
                </Badge>
                <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                  <Link2 className="w-3 h-3 mr-1" />
                  {updateProductsCount} vincular
                </Badge>
              </div>
            </div>

            {/* Margin and Category Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Label className="whitespace-nowrap flex items-center gap-1">
                  <Percent className="w-4 h-4" />
                  Margem de lucro:
                </Label>
                <div className="relative flex-1">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={profitMargin}
                    onChange={(e) => setProfitMargin(e.target.value)}
                    className="pr-8"
                    placeholder="30"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Label className="whitespace-nowrap">Categoria padrão:</Label>
                <Select value={defaultCategoryId} onValueChange={setDefaultCategoryId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Sem categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Info about pricing */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/10 text-accent text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              O valor extraído será salvo como <strong>valor de compra</strong>. O preço de venda será calculado com a margem definida.
            </div>

            {/* Products Table */}
            <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Produto</TableHead>
                    <TableHead className="w-32">Descrição</TableHead>
                    <TableHead className="w-16 text-center">Qtd</TableHead>
                    <TableHead className="w-24">Custo</TableHead>
                    <TableHead className="w-24">Venda</TableHead>
                    <TableHead className="w-36">Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extractedProducts.map((product, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={product.name}
                          onChange={(e) => updateProduct(index, { name: e.target.value })}
                          className="h-8 min-w-[140px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={product.description || ''}
                          onChange={(e) => updateProduct(index, { description: e.target.value })}
                          className="h-8 text-xs"
                          placeholder="TAM, etc."
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={product.quantity}
                          onChange={(e) => updateProduct(index, { quantity: parseInt(e.target.value) || 0 })}
                          className="h-8 text-center w-14"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={product.unitPrice}
                          onChange={(e) => updateProduct(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                          className="h-8 w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-success">
                          {formatCurrency(calculateSalePrice(product.unitPrice))}
                        </span>
                      </TableCell>
                      <TableCell>
                        {product.similarProducts.length > 0 ? (
                          <Select
                            value={product.action === 'create' ? 'create' : product.linkedProductId || ''}
                            onValueChange={(value) => {
                              if (value === 'create') {
                                setProductAction(index, 'create');
                              } else {
                                const linked = product.similarProducts.find(p => p.id === value);
                                if (linked) setProductAction(index, 'link', linked);
                              }
                            }}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="create">
                                <span className="flex items-center gap-1">
                                  <Plus className="w-3 h-3" /> Criar novo
                                </span>
                              </SelectItem>
                              {product.similarProducts.map(similar => (
                                <SelectItem key={similar.id} value={similar.id}>
                                  <span className="flex items-center gap-1">
                                    <Link2 className="w-3 h-3" /> 
                                    {similar.name} ({similar.similarity}%)
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                            <Plus className="w-3 h-3 mr-1" /> Novo produto
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeProduct(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setStep('capture')}>
                Nova Imagem
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button 
                  className="bg-accent hover:bg-accent/90 gap-2"
                  onClick={handleConfirmImport}
                  disabled={extractedProducts.length === 0}
                >
                  <Check className="w-4 h-4" />
                  Confirmar Importação
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Saving */}
        {step === 'saving' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-accent" />
            <p className="text-lg font-medium">Salvando produtos...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
