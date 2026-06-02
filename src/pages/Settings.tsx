import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import {
  Crown,
  ExternalLink,
  GripVertical,
  HelpCircle,
  ImagePlus,
  Info,
  Loader2,
  MessageCircle,
  Palette,
  Phone,
  Store,
  Trash2,
  Upload
} from 'lucide-react';
import { useEffect, useState } from 'react';

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  bronze: { label: 'Bronze', color: 'bg-amber-700 text-white' },
  prata: { label: 'Prata', color: 'bg-slate-400 text-white' },
  ouro: { label: 'Ouro', color: 'bg-yellow-500 text-white' },
};

interface CompanySettings {
  id: string;
  name: string;
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
  const { company, companyId } = useCompanyContext();
  const { planTier, planStatus, subscriptionEnd, isActive } = useSubscription();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [newBannerData, setNewBannerData] = useState({ title: '', link: '' });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [supportNumber, setSupportNumber] = useState<string | null>(null);
  const [supportLoading, setSupportLoading] = useState(false);

  const [formData, setFormData] = useState({
    store_name: '',
    logo_url: '',
    primary_color: '#4F46E5',
    secondary_color: '#F59E0B',
    whatsapp_number: ''
  });

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [companyRes, bannersRes] = await Promise.all([
        supabase.from('companies').select('*').eq('id', companyId).single(),
        supabase.from('banners').select('*').eq('company_id', companyId).order('sort_order')
      ]);

      if (companyRes.data) {
        const c = companyRes.data;
        setSettings({
          id: c.id,
          name: c.name,
          logo_url: c.logo_url,
          primary_color: c.primary_color || '#4F46E5',
          secondary_color: c.secondary_color || '#F59E0B',
          whatsapp_number: c.whatsapp_number,
        });
        setFormData({
          store_name: c.name,
          logo_url: c.logo_url || '',
          primary_color: c.primary_color || '#4F46E5',
          secondary_color: c.secondary_color || '#F59E0B',
          whatsapp_number: c.whatsapp_number || ''
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
    if (companyId) fetchData();
  }, [companyId]);

  const handleResetPassword = async () => {
    if (!user?.email) {
      toast({ 
        title: 'Usuário não encontrado', 
        description: 'Não foi possível identificar seu email.',
        variant: 'destructive' 
      });
      return;
    }

    setResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        toast({ 
          title: 'Erro ao enviar email',
          description: error.message || 'Não foi possível enviar o email. Tente novamente.',
          variant: 'destructive' 
        });
      } else {
        toast({ 
          title: 'Email enviado!', 
          description: 'Verifique sua caixa de entrada para redefinir sua senha.' 
        });
      }
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      toast({ 
        title: 'Erro',
        description: 'Ocorreu um erro ao enviar o email. Tente novamente.',
        variant: 'destructive' 
      });
    } finally {
      setResettingPassword(false);
    }
  };

  const fetchGlobalSupportNumber = async () => {
    if (!user) return;

    setSupportLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Sessão não encontrada');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-support-number`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
          },
        }
      );

      if (!response.ok) {
        const responseText = await response.text();
        console.error('Erro ao carregar suporte global:', response.status, responseText);
        setSupportNumber(null);
        return;
      }

      const json = await response.json();
      setSupportNumber(json.whatsapp_number || null);
    } catch (error) {
      console.error('Erro ao buscar número de suporte global:', error);
      setSupportNumber(null);
    } finally {
      setSupportLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchGlobalSupportNumber();
    }
  }, [user]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!companyId) {
      toast({ title: 'Empresa não identificada', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}/logo-${Date.now()}.${fileExt}`;
      
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

  // Normaliza URL: garante que links externos tenham protocolo
  const normalizeUrl = (url: string): string => {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
  };

  // Apenas armazena o arquivo localmente e gera preview — não envia ainda
  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  // Faz o upload e salva no banco ao clicar em "Salvar Banner"
  const handleBannerSave = async () => {
    if (!bannerFile) {
      toast({ title: 'Selecione uma imagem para o banner', variant: 'destructive' });
      return;
    }
    if (!companyId) {
      toast({ title: 'Empresa não identificada', variant: 'destructive' });
      return;
    }

    setUploadingBanner(true);
    try {
      const fileExt = bannerFile.name.split('.').pop();
      const fileName = `${companyId}/banner-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, bannerFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('banners')
        .insert([{
          image_url: urlData.publicUrl,
          title: newBannerData.title || null,
          link: newBannerData.link ? normalizeUrl(newBannerData.link) : null,
          sort_order: banners.length,
          is_active: true,
          company_id: companyId
        }]);

      if (insertError) throw insertError;

      toast({ title: 'Banner adicionado com sucesso' });
      // Limpa e fecha
      setBannerDialogOpen(false);
      setNewBannerData({ title: '', link: '' });
      setBannerFile(null);
      setBannerPreview(null);
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

    if (!companyId) {
      toast({ title: 'Empresa não identificada', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: formData.store_name,
          logo_url: formData.logo_url || null,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          whatsapp_number: formData.whatsapp_number || null
        })
        .eq('id', companyId);

      if (error) throw error;

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
                  onClick={() => window.open(`/catalogo/${company?.slug}`, '_blank')}
                  disabled={!company?.slug}
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

        {/* Coluna Direita - Plano, Ajuda, Segurança e Banners */}
        <div className="space-y-6">
          {/* Plano Contratado */}
          <div className="form-section space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Plano Contratado
            </h3>
            <div className="p-4 rounded-lg bg-secondary/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plano atual</span>
                {planTier && PLAN_LABELS[planTier] ? (
                  <Badge className={PLAN_LABELS[planTier].color}>
                    {PLAN_LABELS[planTier].label}
                  </Badge>
                ) : (
                  <Badge variant="outline">Sem plano ativo</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={isActive ? 'default' : 'secondary'}>
                  {planStatus === 'active' && 'Ativa'}
                  {planStatus === 'trialing' && 'Período de teste'}
                  {planStatus === 'manual' && 'Manual'}
                  {planStatus === 'past_due' && 'Pagamento pendente'}
                  {planStatus === 'canceled' && 'Cancelada'}
                  {!planStatus && 'Inativa'}
                </Badge>
              </div>
              {subscriptionEnd && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Renova em</span>
                  <span className="text-sm font-medium">
                    {new Date(subscriptionEnd).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Ajuda / Suporte */}
          <div className="form-section space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Ajuda e Suporte
            </h3>
            <div className="p-4 rounded-lg bg-secondary/30 space-y-3">
              <p className="text-sm text-muted-foreground">
                Precisa alterar seu plano, cancelar assinatura ou tirar dúvidas?
                Fale diretamente com nosso suporte pelo WhatsApp.
              </p>
              <p className="text-sm text-muted-foreground">
                Número de suporte: <span className="font-medium text-foreground">{supportLoading ? 'Carregando...' : supportNumber || 'Não configurado'}</span>
              </p>
              <Button
                type="button"
                disabled={supportLoading || !supportNumber}
                className="w-full gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white"
                onClick={() => {
                  if (!supportNumber) {
                    toast({
                      title: 'WhatsApp de suporte não configurado',
                      description: 'O número global de suporte ainda não está disponível.',
                      variant: 'destructive'
                    });
                    return;
                  }

                  const msg = encodeURIComponent(
                    `Olá! Sou da loja "${formData.store_name || 'minha empresa'}" e gostaria de ajuda com meu plano.`
                  );
                  window.open(`https://wa.me/${supportNumber}?text=${msg}`, '_blank');
                }}
              >
                <MessageCircle className="w-4 h-4" />
                Falar com Suporte no WhatsApp
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
              <Dialog
                open={bannerDialogOpen}
                onOpenChange={(open) => {
                  setBannerDialogOpen(open);
                  if (!open) {
                    setNewBannerData({ title: '', link: '' });
                    setBannerFile(null);
                    setBannerPreview(null);
                  }
                }}
              >
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

                    {/* Imagem do Banner */}
                    <div className="space-y-2">
                      <Label>Imagem do Banner *</Label>
                      <label
                        htmlFor="banner-file-input"
                        className="cursor-pointer block"
                      >
                        {bannerPreview ? (
                          <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border group">
                            <img
                              src={bannerPreview}
                              alt="Preview do banner"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-sm font-medium flex items-center gap-2">
                                <Upload className="w-4 h-4" />
                                Trocar imagem
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-32 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors">
                            <Upload className="w-6 h-6 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Clique para selecionar imagem</span>
                          </div>
                        )}
                        <input
                          id="banner-file-input"
                          type="file"
                          accept="image/*"
                          onChange={handleBannerFileSelect}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="space-y-2">
                      <Label>Link ao clicar (opcional)</Label>
                      <Input
                        value={newBannerData.link}
                        onChange={(e) => setNewBannerData(prev => ({ ...prev, link: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>

                    {/* Botão Salvar */}
                    <Button
                      type="button"
                      className="w-full gap-2"
                      onClick={handleBannerSave}
                      disabled={uploadingBanner || !bannerFile}
                    >
                      {uploadingBanner ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {uploadingBanner ? 'Salvando...' : 'Salvar Banner'}
                    </Button>
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