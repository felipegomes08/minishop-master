import lojixIcon from '@/assets/lojix_icon.png';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { useScrollFade } from '@/hooks/useScrollFade';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  Eye,
  EyeOff,
  FolderTree,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Sliders,
  Store,
  Ticket,
  UserCog,
  Users,
  Wallet,
  X
} from 'lucide-react';
import { ReactNode, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Painel', menuKey: 'dashboard' },
  { path: '/products', icon: Package, label: 'Produtos', menuKey: 'products' },
  { path: '/categories', icon: FolderTree, label: 'Categorias', menuKey: 'categories' },
  { path: '/attributes', icon: Sliders, label: 'Atributos', menuKey: 'attributes' },
  { path: '/customers', icon: Users, label: 'Clientes', menuKey: 'customers' },
  { path: '/sales', icon: ShoppingCart, label: 'Vendas', menuKey: 'sales' },
  { path: '/expenses', icon: ReceiptText, label: 'Despesas', menuKey: 'expenses' },
  { path: '/coupons', icon: Ticket, label: 'Cupons', menuKey: 'coupons' },
  { path: '/financial', icon: Wallet, label: 'Financeiro', menuKey: 'financial' },
  { path: '/users', icon: UserCog, label: 'Usuários', menuKey: 'users' },
  { path: '/settings', icon: Settings, label: 'Configurações', menuKey: 'settings' },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { signOut, user } = useAuth();
  const { company } = useCompanyContext();
  const { allowedMenus, isRestricted } = useUserPermissions();
  const navigate = useNavigate();
  const location = useLocation();
  
  const userName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Usuário';
  const userInitial = userName.charAt(0).toUpperCase();

  const desktopScroll = useScrollFade<HTMLElement>();
  const mobileScroll = useScrollFade<HTMLElement>();
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const validatePassword = (pw: string) => {
    const errors: string[] = [];
    const minLength = 8;
    const hasLower = /[a-z]/.test(pw);
    const hasUpper = /[A-Z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    const hasSymbol = /[^A-Za-z0-9]/.test(pw);
    const common = [
      '123456','password','12345678','qwerty','abc123','password1','111111','123456789','12345','senha','1234','admin'
    ];

    if (pw.length < minLength) errors.push(`A senha deve ter ao menos ${minLength} caracteres.`);
    if (!hasLower) errors.push('Inclua letras minúsculas.');
    if (!hasUpper) errors.push('Inclua letras maiúsculas.');
    if (!hasNumber) errors.push('Inclua pelo menos um número.');
    if (!hasSymbol) errors.push('Inclua pelo menos um símbolo (ex.: !@#$%).');
    const pwLower = pw.toLowerCase();
    if (user?.email && pwLower.includes(user.email.split('@')[0].toLowerCase())) errors.push('A senha não pode conter seu nome de usuário/email.');
    if (common.includes(pwLower)) errors.push('Senha muito comum ou previsível; escolha outra.');

    return errors;
  };

  const visibleNavItems = isRestricted
    ? navItems.filter((i) => allowedMenus.has(i.menuKey))
    : navItems;

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleChangePassword = async () => {
    setPasswordErrors([]);
    if (!newPassword || !confirmPassword) {
      setPasswordErrors(['Preencha as duas senhas.']);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErrors(['As senhas não conferem.']);
      return;
    }

    const validation = validatePassword(newPassword);
    if (validation.length > 0) {
      setPasswordErrors(validation);
      return;
    }

    setChangingPassword(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        toast({ title: 'Sessão ausente', description: 'Sua sessão não foi encontrada. Faça login novamente.', variant: 'destructive' });
        // clear local auth state and redirect to login
        await signOut();
        navigate('/auth');
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        console.error('updateUser error', error);
        const msg = (error as any)?.message || '';
        // handle session issues
        if (msg.toLowerCase().includes('session')) {
          toast({ title: 'Sessão inválida', description: 'Sua sessão expirou. Faça login novamente.', variant: 'destructive' });
          await signOut();
          navigate('/auth');
          return;
        }
        // handle server-side weak password rejection
        if (/weak|known|easy to guess|comum|fraca/i.test(msg)) {
          toast({ title: 'Senha rejeitada pelo servidor', description: 'A senha foi considerada fraca ou muito comum. Aumente o comprimento e a complexidade (maiúsculas, números, símbolos).', variant: 'destructive' });
          return;
        }
        toast({ title: 'Erro ao alterar senha', description: msg || 'Tente novamente.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Senha alterada', description: 'Sua senha foi atualizada com sucesso.' });
      setUserDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors([]);
    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      toast({ title: 'Erro', description: 'Ocorreu um erro ao alterar a senha.', variant: 'destructive' });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-sidebar transition-all duration-300 ease-in-out shrink-0',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 overflow-hidden rounded-xl bg-sidebar-primary flex items-center justify-center">
                {company?.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.name ?? 'Logo da empresa'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img src={lojixIcon} alt="Lojix" className="w-8 h-8 rounded-lg" />
                )}
              </div>
              <span className="font-semibold text-sidebar-foreground">{company?.name ?? 'Admin'}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <ChevronLeft className={cn('w-5 h-5 transition-transform', !sidebarOpen && 'rotate-180')} />
          </Button>
        </div>

        <div className="flex-1 relative overflow-hidden">
          {/* Fade top — só aparece se há conteúdo acima */}
          <div
            className="pointer-events-none absolute top-0 left-0 right-0 h-8 z-10 bg-gradient-to-b from-sidebar to-transparent transition-opacity duration-300"
            style={{ opacity: desktopScroll.canScrollUp ? 1 : 0 }}
          />
          {/* Fade bottom — só aparece se há conteúdo abaixo */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 z-10 bg-gradient-to-t from-sidebar to-transparent transition-opacity duration-300"
            style={{ opacity: desktopScroll.canScrollDown ? 1 : 0 }}
          />
          <nav
            ref={desktopScroll.ref as React.RefObject<HTMLElement>}
            className="h-full p-3 space-y-1 overflow-y-auto"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {visibleNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t border-sidebar-border">
          <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
            <DialogTrigger asChild>
              {sidebarOpen ? (
                <button className="mb-3 p-3 bg-sidebar-accent rounded-lg w-full text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-semibold shrink-0">
                      {userInitial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
                      <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
                    </div>
                  </div>
                </button>
              ) : (
                <button className="w-full flex items-center justify-center p-2">
                  <div className="w-6 h-6 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-semibold">{userInitial}</div>
                </button>
              )}
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Alterar senha</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="space-y-1">
                  <Label htmlFor="sidebarNewPassword">Nova senha</Label>
                  <div className="relative">
                    <Input id="sidebarNewPassword" type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={changingPassword} />
                    <Button variant="ghost" size="icon" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sidebarConfirmPassword">Confirmar senha</Label>
                  <div className="relative">
                    <Input id="sidebarConfirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={changingPassword} />
                    <Button variant="ghost" size="icon" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2 top-1/2 -translate-y-1/2" aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                {passwordErrors.length > 0 && (
                  <div className="text-sm text-destructive space-y-1">
                    {passwordErrors.map((err, idx) => (
                      <p key={idx}>{err}</p>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={handleChangePassword} disabled={changingPassword}>
                    {changingPassword && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Salvar
                  </Button>
                  <Button variant="ghost" onClick={() => setUserDialogOpen(false)}>Fechar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <button
            onClick={handleSignOut}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
              'text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive'
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 w-64 bg-sidebar z-50 transform transition-transform duration-300 lg:hidden',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 overflow-hidden rounded-xl bg-sidebar-primary flex items-center justify-center">
              {company?.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name ?? 'Logo da empresa'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Store className="w-5 h-5 text-sidebar-primary-foreground" />
              )}
            </div>
            <span className="font-semibold text-sidebar-foreground">{company?.name ?? 'Admin'}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 relative overflow-hidden">
          {/* Fade top — só aparece se há conteúdo acima */}
          <div
            className="pointer-events-none absolute top-0 left-0 right-0 h-8 z-10 bg-gradient-to-b from-sidebar to-transparent transition-opacity duration-300"
            style={{ opacity: mobileScroll.canScrollUp ? 1 : 0 }}
          />
          {/* Fade bottom — só aparece se há conteúdo abaixo */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 z-10 bg-gradient-to-t from-sidebar to-transparent transition-opacity duration-300"
            style={{ opacity: mobileScroll.canScrollDown ? 1 : 0 }}
          />
          <nav
            ref={mobileScroll.ref as React.RefObject<HTMLElement>}
            className="h-full p-3 space-y-1 overflow-y-auto"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {visibleNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t border-sidebar-border">
          <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
            <DialogTrigger asChild>
              <div className="mb-3 p-3 bg-sidebar-accent rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-semibold shrink-0">
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
                    <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Alterar senha</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="space-y-1">
                  <Label htmlFor="sidebarNewPasswordMobile">Nova senha</Label>
                  <div className="relative">
                    <Input id="sidebarNewPasswordMobile" type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={changingPassword} />
                    <Button variant="ghost" size="icon" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sidebarConfirmPasswordMobile">Confirmar senha</Label>
                  <div className="relative">
                    <Input id="sidebarConfirmPasswordMobile" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={changingPassword} />
                    <Button variant="ghost" size="icon" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2 top-1/2 -translate-y-1/2" aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                {passwordErrors.length > 0 && (
                  <div className="text-sm text-destructive space-y-1">
                    {passwordErrors.map((err, idx) => (
                      <p key={idx}>{err}</p>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={handleChangePassword} disabled={changingPassword}>
                    {changingPassword && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Salvar
                  </Button>
                  <Button variant="ghost" onClick={() => setUserDialogOpen(false)}>Fechar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 overflow-hidden rounded-lg bg-primary flex items-center justify-center">
              {company?.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name ?? 'Logo da empresa'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <img src={lojixIcon} alt="Lojix" className="w-8 h-8 rounded-lg" />
              )}
            </div>
            <span className="font-semibold">{company?.name ?? 'Admin'}</span>
          </div>
          <div className="w-10" />
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
