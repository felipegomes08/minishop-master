import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Store,
  Upload,
  Loader2,
  Palette,
  Phone,
  ExternalLink,
  KeyRound,
  ImagePlus,
  Trash2,
  GripVertical,
  Info
} from 'lucide-react';

interface StoreSettings {
  id: string;
  store_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  whatsapp_number: string | null;
}

interface Banner {
  id: string;
  image_url: string;
  title: string | null;
  link: string | null;
  sort_order: number;
  is_active: boolean;
}

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [newBannerData, setNewBannerData] = useState({ title: '', link: '' });

  const [formData, setFormData] = useState({
    store_name: '',
    logo_url: '',
    primary_color: '#4F46E5',
    secondary_color: '#F59E0B',
    whatsapp_number: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, bannersRes] = await Promise.all([
        supabase.from('store_settings').select('*').single(),
        supabase.from('banners').select('*').order('sort_order')
      ]);

      if (settingsRes.data) {
        setSettings(settingsRes.data);
        setFormData({
          store_name: settingsRes.data.store_name,
          logo_url: settingsRes.data.logo_url || '',
          primary_color: settingsRes.data.primary_color,
          secondary_color: settingsRes.data.secondary_color,
          whatsapp_number: settingsRes.data.whatsapp_number || ''
        });
      }

      if (bannersRes.data) setBanners(bannersRes.data);
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResetPassword = async () => {
    if (!user?.email) {
      toast({ title: 'Usuário não encontrado', variant: 'destructive' });
      return;
    }

    setResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth`
      });

      if (error) throw error;

      toast({ 
        title: 'Email enviado!', 
        description: 'Verifique sua caixa de entrada para redefinir a senha.' 
      });
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      toast({ title: 'Erro ao enviar email de redefinição', variant: 'destructive' });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage
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

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBanner(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `banner-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('banners')
        .insert([{
          image_url: urlData.publicUrl,
          title: newBannerData.title || null,
          link: newBannerData.link || null,
          sort_order: banners.length,
          is_active: true
        }]);

      if (insertError) throw insertError;

      toast({ title: 'Banner adicionado com sucesso' });
      setBannerDialogOpen(false);
      setNewBannerData({ title: '', link: '' });
      fetchData();
    } catch (error) {
      console.error('Erro ao adicionar banner:', error);
      toast({ title: 'Erro ao adicionar banner', variant: 'destructive' });
    } finally {
      setUploadingBanner(false);
    }
  };

  const deleteBanner = async (id: string) => {
    try {
      const { error } = await supabase.from('banners').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Banner excluído' });
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir banner:', error);
      toast({ title: 'Erro ao excluir banner', variant: 'destructive' });
    }
  };

  const toggleBannerActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('banners')
        .update({ is_active: !isActive })
        .eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar banner:', error);
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
      fetchData();
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna Esquerda - Configurações Principais */}
        <form onSubmit={handleSubmit} className="space-y-6">
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
                Número com código do país e DDD, sem espaços.
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
                    Seu catálogo online está disponível
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  type="button"
                  onClick={() => window.open('/catalogo', '_blank')}
                >
                  Ver Catálogo
                </Button>
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
                    Recomendado: 256x256px
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
                    Primária
                  </div>
                  <div
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: formData.secondary_color }}
                  >
                    Secundária
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

        {/* Coluna Direita - Segurança e Banners */}
        <div className="space-y-6">
          {/* Segurança */}
          <div className="form-section space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              Segurança
            </h3>
            <div className="p-4 rounded-lg bg-secondary/30">
              <p className="text-sm text-muted-foreground mb-3">
                Enviaremos um link para redefinir sua senha por email.
              </p>
              <Button 
                variant="outline" 
                onClick={handleResetPassword}
                disabled={resettingPassword}
              >
                {resettingPassword && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Redefinir Senha
              </Button>
            </div>
          </div>

          {/* Banners */}
          <div className="form-section space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <ImagePlus className="w-4 h-4" />
                Banners do Catálogo
              </h3>
              <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    Adicionar Banner
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Banner</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50 flex items-start gap-2">
                      <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        Tamanho recomendado: <strong>1200x400px</strong> (proporção 3:1). 
                        Imagens menores serão esticadas.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Título (opcional)</Label>
                      <Input
                        value={newBannerData.title}
                        onChange={(e) => setNewBannerData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Ex: Promoção de Verão"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Link (opcional)</Label>
                      <Input
                        value={newBannerData.link}
                        onChange={(e) => setNewBannerData(prev => ({ ...prev, link: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Imagem do Banner *</Label>
                      <label className="cursor-pointer block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBannerUpload}
                          className="hidden"
                          disabled={uploadingBanner}
                        />
                        <Button type="button" className="w-full gap-2" disabled={uploadingBanner}>
                          {uploadingBanner ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          {uploadingBanner ? 'Enviando...' : 'Selecionar Imagem'}
                        </Button>
                      </label>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 flex items-start gap-2 mb-4">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Os banners serão exibidos em slide na página inicial do catálogo. 
                Tamanho ideal: <strong>1200x400px</strong>.
              </p>
            </div>

            {banners.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                <ImagePlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum banner adicionado</p>
                <p className="text-sm">O catálogo mostrará o banner padrão</p>
              </div>
            ) : (
              <div className="space-y-3">
                {banners.map((banner) => (
                  <div 
                    key={banner.id} 
                    className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg"
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="w-24 h-8 rounded overflow-hidden bg-muted shrink-0">
                      <img 
                        src={banner.image_url} 
                        alt={banner.title || 'Banner'} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {banner.title || 'Sem título'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {banner.is_active ? 'Ativo' : 'Inativo'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleBannerActive(banner.id, banner.is_active)}
                    >
                      {banner.is_active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir banner?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteBanner(banner.id)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}