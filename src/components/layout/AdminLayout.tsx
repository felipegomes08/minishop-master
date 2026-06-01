import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { useScrollFade } from '@/hooks/useScrollFade';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { cn } from '@/lib/utils';
import {
    ChevronLeft,
    FolderTree,
    LayoutDashboard,
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
    X,
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
  const { signOut } = useAuth();
  const { company } = useCompanyContext();
  const { allowedMenus, isRestricted } = useUserPermissions();
  const navigate = useNavigate();
  const location = useLocation();

  const desktopScroll = useScrollFade<HTMLElement>();
  const mobileScroll = useScrollFade<HTMLElement>();

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
                  <Store className="w-5 h-5 text-sidebar-primary-foreground" />
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
                <Store className="w-4 h-4 text-primary-foreground" />
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
