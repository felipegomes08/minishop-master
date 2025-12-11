import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { 
  Store,
  Upload,
  Loader2,
  Palette,
  Phone,
  ExternalLink
} from 'lucide-react';

interface StoreSettings {
  id: string;
  store_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  whatsapp_number: string | null;
}

export default function Settings() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    store_name: '',
    logo_url: '',
    primary_color: '#4F46E5',
    secondary_color: '#F59E0B',
    whatsapp_number: ''
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings(data);
        setFormData({
          store_name: data.store_name,
          logo_url: data.logo_url || '',
          primary_color: data.primary_color,
          secondary_color: data.secondary_color,
          whatsapp_number: data.whatsapp_number || ''
        });
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, logo_url: urlData.publicUrl }));
      toast({ title: 'Logo enviado com sucesso' });
    } catch (error) {
      console.error('Erro ao enviar logo:', error);
      toast({ title: 'Erro ao enviar logo', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.store_name) {
      toast({ title: 'Nome da loja é obrigatório', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      const settingsData = {
        store_name: formData.store_name,
        logo_url: formData.logo_url || null,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        whatsapp_number: formData.whatsapp_number || null
      };

      if (settings) {
        const { error } = await supabase
          .from('store_settings')
          .update(settingsData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('store_settings')
          .insert([settingsData]);

        if (error) throw error;
      }

      toast({ title: 'Configurações salvas com sucesso' });
      fetchSettings();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({ title: 'Erro ao salvar configurações', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="text-muted-foreground mt-1">Configure as preferências da sua loja</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="form-section space-y-6">
          {/* Store Name */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              Nome da Loja
            </Label>
            <Input
              value={formData.store_name}
              onChange={(e) => setFormData(prev => ({ ...prev, store_name: e.target.value }))}
              placeholder="Minha Loja"
            />
          </div>

          {/* WhatsApp */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              WhatsApp para Vendas
            </Label>
            <Input
              value={formData.whatsapp_number}
              onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_number: e.target.value }))}
              placeholder="5511999999999"
            />
            <p className="text-sm text-muted-foreground">
              Número com código do país e DDD, sem espaços. Ex: 5511999999999
            </p>
          </div>

          {/* Catálogo Público */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Catálogo Público
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Seu catálogo online está disponível para seus clientes
                </p>
              </div>
              <a href="/catalogo" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  Ver Catálogo
                </Button>
              </a>
            </div>
          </div>

          {/* Logo */}
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-secondary/30">
                {formData.logo_url ? (
                  <img 
                    src={formData.logo_url} 
                    alt="Logo da loja" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Store className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <Button type="button" variant="outline" className="gap-2" asChild>
                    <span>
                      {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      Enviar Logo
                    </span>
                  </Button>
                </label>
                <p className="text-sm text-muted-foreground mt-1">
                  Recomendado: Imagem quadrada, 256x256px
                </p>
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Cores da Marca
            </Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Cor Primária</Label>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                    style={{ backgroundColor: formData.primary_color }}
                  >
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <Input
                    value={formData.primary_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="flex-1 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Cor Secundária</Label>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                    style={{ backgroundColor: formData.secondary_color }}
                  >
                    <input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                      className="w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <Input
                    value={formData.secondary_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                    className="flex-1 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Color Preview */}
            <div className="p-4 rounded-lg bg-secondary/30">
              <p className="text-sm text-muted-foreground mb-3">Pré-visualização</p>
              <div className="flex items-center gap-3">
                <div
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: formData.primary_color }}
                >
                  Botão Primário
                </div>
                <div
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: formData.secondary_color }}
                >
                  Botão Secundário
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" className="bg-accent hover:bg-accent/90" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salvar Alterações
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
