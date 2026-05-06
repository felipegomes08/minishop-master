import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useSuperAdminCheck } from "@/hooks/useSuperAdminCheck";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { PATH_TO_MENU_KEY } from "@/lib/planLimits";
import AdminLayout from "@/components/layout/AdminLayout";
import MasterAdminLayout from "@/components/layout/MasterAdminLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Attributes from "./pages/Attributes";
import Customers from "./pages/Customers";
import Sales from "./pages/Sales";
import Coupons from "./pages/Coupons";
import Settings from "./pages/Settings";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import NotFound from "./pages/NotFound";
import Users from "./pages/Users";
import Financial from "./pages/Financial";
import Catalog from "./pages/Catalog";
import ProductDetail from "./pages/ProductDetail";
import Landing from "./pages/Landing";
import PostCheckout from "./pages/PostCheckout";
import MasterDashboard from "./pages/master/MasterDashboard";
import MasterCompanies from "./pages/master/MasterCompanies";
import MasterUsers from "./pages/master/MasterUsers";
import MasterSettings from "./pages/master/MasterSettings";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdminCheck();
  const { allowedMenus, isRestricted, loading: permLoading } = useUserPermissions();
  const location = useLocation();

  if (authLoading || adminLoading || superAdminLoading || permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Super admins should use the master panel, not company panel
  if (isSuperAdmin) {
    return <Navigate to="/master" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/auth?error=unauthorized" replace />;
  }

  // Bloqueia acesso direto via URL para funcionários sem permissão
  if (isRestricted) {
    const menuKey = PATH_TO_MENU_KEY[location.pathname];
    if (menuKey && menuKey !== 'dashboard' && !allowedMenus.has(menuKey)) {
      return <Navigate to="/" replace />;
    }
  }

  return <AdminLayout>{children}</AdminLayout>;
}

function MasterProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdminCheck();

  if (authLoading || superAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/auth?error=unauthorized" replace />;
  }

  return <MasterAdminLayout>{children}</MasterAdminLayout>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/landing" element={<Landing />} />
      <Route path="/pos-pagamento" element={<PostCheckout />} />
      
      {/* Rotas Públicas - Catálogo */}
      <Route path="/catalogo/:slug" element={<Catalog />} />
      <Route path="/catalogo/:slug/produto/:id" element={<ProductDetail />} />
      
      {/* Rotas Master Admin */}
      <Route path="/master" element={<MasterProtectedRoute><MasterDashboard /></MasterProtectedRoute>} />
      <Route path="/master/companies" element={<MasterProtectedRoute><MasterCompanies /></MasterProtectedRoute>} />
      <Route path="/master/users" element={<MasterProtectedRoute><MasterUsers /></MasterProtectedRoute>} />
      <Route path="/master/settings" element={<MasterProtectedRoute><MasterSettings /></MasterProtectedRoute>} />
      
      {/* Rotas Administrativas */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
      <Route path="/attributes" element={<ProtectedRoute><Attributes /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
      <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
      <Route path="/coupons" element={<ProtectedRoute><Coupons /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
      <Route path="/financial" element={<ProtectedRoute><Financial /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
