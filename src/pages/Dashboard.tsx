import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Users,
  TrendingUp,
  CalendarIcon,
  Sparkles,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface DashboardStats {
  totalRevenue: number;
  totalSales: number;
  totalProducts: number;
  totalCustomers: number;
  bestSellingProducts: { name: string; quantity: number }[];
  topCustomers: { name: string; total: number }[];
  revenueByDay: { date: string; revenue: number }[];
}

interface AIInsight {
  title: string;
  description: string;
  type: 'success' | 'warning' | 'info';
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  const fetchStats = async () => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    setLoading(true);
    try {
      const fromDate = startOfDay(dateRange.from).toISOString();
      const toDate = endOfDay(dateRange.to).toISOString();

      // Fetch sales within date range
      const { data: sales } = await supabase
        .from('sales')
        .select('*, sale_items(*), customers(name)')
        .gte('created_at', fromDate)
        .lte('created_at', toDate);

      // Fetch all products
      const { data: products } = await supabase.from('products').select('*');
      
      // Fetch all customers
      const { data: customers } = await supabase.from('customers').select('*');

      // Calculate stats
      const totalRevenue = sales?.reduce((sum, s) => sum + Number(s.total), 0) || 0;
      const totalSales = sales?.length || 0;
      const totalProducts = products?.length || 0;
      const totalCustomers = customers?.length || 0;

      // Best selling products
      const productSales: Record<string, number> = {};
      sales?.forEach(sale => {
        sale.sale_items?.forEach((item: { product_name: string; quantity: number }) => {
          productSales[item.product_name] = (productSales[item.product_name] || 0) + item.quantity;
        });
      });
      const bestSellingProducts = Object.entries(productSales)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      // Top customers
      const customerTotals: Record<string, { name: string; total: number }> = {};
      sales?.forEach(sale => {
        if (sale.customer_id && sale.customers) {
          const name = sale.customers.name;
          if (!customerTotals[sale.customer_id]) {
            customerTotals[sale.customer_id] = { name, total: 0 };
          }
          customerTotals[sale.customer_id].total += Number(sale.total);
        }
      });
      const topCustomers = Object.values(customerTotals)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      // Revenue by day
      const revenueByDay: Record<string, number> = {};
      sales?.forEach(sale => {
        const date = format(new Date(sale.created_at), 'MMM dd');
        revenueByDay[date] = (revenueByDay[date] || 0) + Number(sale.total);
      });
      const revenueData = Object.entries(revenueByDay)
        .map(([date, revenue]) => ({ date, revenue }))
        .slice(-14);

      setStats({
        totalRevenue,
        totalSales,
        totalProducts,
        totalCustomers,
        bestSellingProducts,
        topCustomers,
        revenueByDay: revenueData
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAIInsights = async () => {
    if (!stats) return;
    
    setInsightsLoading(true);
    try {
      const { data: products } = await supabase.from('products').select('*');
      
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: {
          stats: {
            totalRevenue: stats.totalRevenue,
            totalSales: stats.totalSales,
            bestSellingProducts: stats.bestSellingProducts,
            topCustomers: stats.topCustomers
          },
          products: products?.map(p => ({
            name: p.name,
            stock: p.stock,
            price: p.price,
            is_active: p.is_active
          }))
        }
      });

      if (error) throw error;
      setInsights(data?.insights || []);
    } catch (error) {
      console.error('Error fetching insights:', error);
      setInsights([
        { title: 'Welcome!', description: 'Start adding products and making sales to get AI-powered insights.', type: 'info' }
      ]);
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  useEffect(() => {
    if (stats) {
      fetchAIInsights();
    }
  }, [stats]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your store performance</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="w-4 h-4" />
              {dateRange?.from && dateRange?.to ? (
                <>
                  {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                </>
              ) : (
                'Select date range'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))
        ) : (
          <>
            <div className="kpi-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats?.totalRevenue || 0)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-success" />
                </div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold mt-1">{stats?.totalSales || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-accent" />
                </div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Products</p>
                  <p className="text-2xl font-bold mt-1">{stats?.totalProducts || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Package className="w-6 h-6 text-warning" />
                </div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Customers</p>
                  <p className="text-2xl font-bold mt-1">{stats?.totalCustomers || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-accent" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64" />
            ) : stats?.revenueByDay && stats.revenueByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--accent))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No sales data available for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Best Selling Products */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="w-5 h-5 text-warning" />
              Best Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : stats?.bestSellingProducts && stats.bestSellingProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.bestSellingProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="quantity" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No product sales data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-accent" />
            AI Insights
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchAIInsights}
            disabled={insightsLoading}
          >
            <RefreshCw className={cn("w-4 h-4", insightsLoading && "animate-spin")} />
          </Button>
        </CardHeader>
        <CardContent>
          {insightsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
              <span className="ml-2 text-muted-foreground">Analyzing your data...</span>
            </div>
          ) : insights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.map((insight, index) => (
                <div 
                  key={index}
                  className={cn(
                    "p-4 rounded-lg border",
                    insight.type === 'success' && "bg-success/5 border-success/20",
                    insight.type === 'warning' && "bg-warning/5 border-warning/20",
                    insight.type === 'info' && "bg-accent/5 border-accent/20"
                  )}
                >
                  <h4 className="font-medium mb-1">{insight.title}</h4>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Add products and make sales to get AI-powered insights
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Customers */}
      {stats?.topCustomers && stats.topCustomers.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-primary" />
              Top Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topCustomers.map((customer, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="font-medium">{customer.name}</span>
                  </div>
                  <span className="text-success font-medium">{formatCurrency(customer.total)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
