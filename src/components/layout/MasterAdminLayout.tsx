import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Building2,
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from 'lucide-react';
import lojixIcon from '@/assets/lojix_icon.svg';

interface MasterAdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/master', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/master/companies', icon: Building2, label: 'Empresas' },
  { path: '/master/users', icon: Users, label: 'Usuários' },
  { path: '/master/settings', icon: Settings, label: 'Configurações' },
];

export default function MasterAdminLayout({ children }: MasterAdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-slate-900 transition-all duration-300 ease-in-out',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <img src={lojixIcon} alt="Lojix" className="w-10 h-10 rounded-xl" />
              <span className="font-semibold text-white">Master Admin</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-300 hover:bg-slate-800"
          >
            <ChevronLeft className={cn('w-5 h-5 transition-transform', !sidebarOpen && 'rotate-180')} />
          </Button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                  isActive
                    ? 'bg-amber-500 text-slate-900'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-700">
          <button
            onClick={handleSignOut}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
              'text-slate-300 hover:bg-red-500/20 hover:text-red-400'
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 w-64 bg-slate-900 z-50 transform transition-transform duration-300 lg:hidden',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <img src={lojixIcon} alt="Lojix" className="w-10 h-10 rounded-xl" />
            <span className="font-semibold text-white">Master Admin</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(false)}
            className="text-slate-300 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                  isActive
                    ? 'bg-amber-500 text-slate-900'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-700">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-slate-300 hover:bg-red-500/20 hover:text-red-400"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <img src={lojixIcon} alt="Lojix" className="w-8 h-8 rounded-lg" />
            <span className="font-semibold">Master Admin</span>
          </div>
          <div className="w-10" />
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto bg-slate-50 dark:bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
