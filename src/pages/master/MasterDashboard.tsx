import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Package, Users, ShoppingCart, TrendingUp, Activity } from 'lucide-react';

interface DashboardStats {
  totalCompanies: number;
  activeCompanies: number;
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  totalCustomers: number;
}

export default function MasterDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch companies
        const { data: companies } = await supabase.from('companies').select('id, is_active');
        
        // Fetch products count
        const { count: productsCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true });

        // Fetch sales
        const { data: sales } = await supabase.from('sales').select('total');
        
        // Fetch customers count
        const { count: customersCount } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true });

        setStats({
          totalCompanies: companies?.length || 0,
          activeCompanies: companies?.filter(c => c.is_active).length || 0,
          totalProducts: productsCount || 0,
          totalSales: sales?.length || 0,
          totalRevenue: sales?.reduce((acc, s) => acc + Number(s.total), 0) || 0,
          totalCustomers: customersCount || 0
        });
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const statCards = [
    {
      title: 'Total de Empresas',
      value: stats?.totalCompanies || 0,
      subtitle: `${stats?.activeCompanies || 0} ativas`,
      icon: Building2,
      color: 'bg-blue-500'
    },
    {
      title: 'Total de Produtos',
      value: stats?.totalProducts || 0,
      subtitle: 'em todas as empresas',
      icon: Package,
      color: 'bg-green-500'
    },
    {
      title: 'Total de Vendas',
      value: stats?.totalSales || 0,
      subtitle: formatCurrency(stats?.totalRevenue || 0),
      icon: ShoppingCart,
      color: 'bg-purple-500'
    },
    {
      title: 'Total de Clientes',
      value: stats?.totalCustomers || 0,
      subtitle: 'cadastrados',
      icon: Users,
      color: 'bg-amber-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard Master</h1>
        <p className="text-muted-foreground mt-1">
          Visão geral de todas as empresas e métricas da plataforma
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          statCards.map((stat, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={cn(stat.color, 'p-2 rounded-lg')}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Ações Rápidas
            </CardTitle>
            <CardDescription>
              Gerencie a plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/master/companies"
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <Building2 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Gerenciar Empresas</p>
                <p className="text-sm text-muted-foreground">Criar, editar e desativar empresas</p>
              </div>
            </a>
            <a
              href="/master/users"
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Gerenciar Usuários</p>
                <p className="text-sm text-muted-foreground">Vincular usuários às empresas</p>
              </div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Status do Sistema
            </CardTitle>
            <CardDescription>
              Saúde da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">API</span>
                <span className="flex items-center gap-2 text-sm text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Operacional
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Banco de Dados</span>
                <span className="flex items-center gap-2 text-sm text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Operacional
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Storage</span>
                <span className="flex items-center gap-2 text-sm text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Operacional
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
