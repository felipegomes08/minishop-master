import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyContext } from '@/hooks/useCompanyContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  TrendingUp, TrendingDown, Wallet, ShoppingBag, Crown, MessageCircle, Send, Sparkles, Loader2, CalendarIcon,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const SUPPORT_WHATSAPP = '5519996688116';

function brl(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function monthLabel(d: Date) {
  return d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
}

type Period = 'current' | 'previous' | '3m' | '6m' | '12m';

function getRange(period: Period): { start: Date; end: Date; label: string } {
  const now = new Date();
  if (period === 'current') {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59), label: 'Mês atual' };
  }
  if (period === 'previous') {
    return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59), label: 'Mês anterior' };
  }
  const map = { '3m': 3, '6m': 6, '12m': 12 } as const;
  const m = map[period];
  return { start: new Date(now.getFullYear(), now.getMonth() - (m - 1), 1), end: now, label: `Últimos ${m} meses` };
}

interface ChatMsg { role: 'user' | 'assistant'; content: string }

export default function Financial() {
  const { companyId, loading: companyLoading } = useCompanyContext();
  const { planTier, loading: subLoading } = useSubscription();
  const allowed = planTier === 'prata' || planTier === 'ouro';

  const [period, setPeriod] = useState<Period>('current');
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [topExpenses, setTopExpenses] = useState<{ category: string; amount: number }[]>([]);
  const [recentSales, setRecentSales] = useState<{ id: string; total: number; created_at: string }[]>([]);
  const [chartData, setChartData] = useState<{ month: string; receita: number; despesas: number }[]>([]);

  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Olá! Sou seu assistente financeiro. Pergunte sobre vendas, despesas, estoque ou clientes da sua loja.' },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!companyId || !allowed) return;
    loadData();
  }, [companyId, period, allowed]);

  async function loadData() {
    if (!companyId) return;
    setLoading(true);
    const { start, end } = getRange(period);

    const [salesRes, expRes] = await Promise.all([
      supabase.from('sales').select('id, total, created_at').eq('company_id', companyId)
        .gte('created_at', start.toISOString()).lte('created_at', end.toISOString())
        .order('created_at', { ascending: false }),
      supabase.from('expenses').select('amount, category, expense_date').eq('company_id', companyId)
        .gte('expense_date', start.toISOString().slice(0, 10))
        .lte('expense_date', end.toISOString().slice(0, 10)),
    ]);

    const sales = salesRes.data ?? [];
    const exps = expRes.data ?? [];

    setRevenue(sales.reduce((a, s) => a + (Number(s.total) || 0), 0));
    setExpenses(exps.reduce((a, e) => a + (Number(e.amount) || 0), 0));
    setSalesCount(sales.length);
    setRecentSales(sales.slice(0, 5));

    const cat: Record<string, number> = {};
    for (const e of exps) cat[e.category] = (cat[e.category] || 0) + Number(e.amount || 0);
    setTopExpenses(Object.entries(cat).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount).slice(0, 5));

    // Chart: 12 months always
    const now = new Date();
    const start12 = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const [s12, e12] = await Promise.all([
      supabase.from('sales').select('total, created_at').eq('company_id', companyId).gte('created_at', start12.toISOString()),
      supabase.from('expenses').select('amount, expense_date').eq('company_id', companyId).gte('expense_date', start12.toISOString().slice(0, 10)),
    ]);
    const buckets: Record<string, { receita: number; despesas: number; date: Date }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      buckets[k] = { receita: 0, despesas: 0, date: d };
    }
    for (const s of s12.data ?? []) {
      const d = new Date(s.created_at);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      if (buckets[k]) buckets[k].receita += Number(s.total) || 0;
    }
    for (const e of e12.data ?? []) {
      const d = new Date(e.expense_date);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      if (buckets[k]) buckets[k].despesas += Number(e.amount) || 0;
    }
    setChartData(Object.values(buckets).map(b => ({ month: monthLabel(b.date), receita: b.receita, despesas: b.despesas })));

    setLoading(false);
  }

  const profit = revenue - expenses;

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;
    const newMsgs: ChatMsg[] = [...messages, { role: 'user', content: text }];
    setMessages(newMsgs);
    setInput('');
    setStreaming(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-chat`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ messages: newMsgs.map(m => ({ role: m.role, content: m.content })) }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({ error: 'Erro' }));
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${errData.error || 'Falha ao consultar IA.'}` }]);
        setStreaming(false);
        return;
      }

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let acc = '';
      let done = false;

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf('\n')) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: acc } : m));
            }
          } catch { buf = line + '\n' + buf; break; }
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Erro de conexão. Tente novamente.' }]);
    } finally {
      setStreaming(false);
    }
  }

  if (companyLoading || subLoading) {
    return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;
  }

  if (!allowed) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Crown className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Recurso exclusivo dos planos Prata e Ouro</CardTitle>
            <CardDescription>
              O painel Financeiro com assistente de IA está disponível a partir do plano Prata.
              Faça upgrade para acessar análises de receita, despesas e o chat inteligente sobre seu negócio.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Olá! Quero fazer upgrade do meu plano para acessar o Financeiro.')}`, '_blank')}>
              <MessageCircle className="w-4 h-4 mr-2" /> Falar com o suporte
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const periodLabel = getRange(period).label;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground text-sm">Resumo de receitas, despesas e desempenho da sua loja.</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Mês atual</SelectItem>
            <SelectItem value="previous">Mês anterior</SelectItem>
            <SelectItem value="3m">Últimos 3 meses</SelectItem>
            <SelectItem value="6m">Últimos 6 meses</SelectItem>
            <SelectItem value="12m">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={<TrendingUp className="w-5 h-5" />} label="Receita" value={brl(revenue)} loading={loading} accent="text-emerald-600" />
        <SummaryCard icon={<TrendingDown className="w-5 h-5" />} label="Despesas" value={brl(expenses)} loading={loading} accent="text-rose-600" />
        <SummaryCard icon={<Wallet className="w-5 h-5" />} label="Lucro" value={brl(profit)} loading={loading} accent={profit >= 0 ? 'text-primary' : 'text-rose-600'} />
        <SummaryCard icon={<ShoppingBag className="w-5 h-5" />} label="Vendas" value={String(salesCount)} loading={loading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Receita x Despesas — últimos 12 meses</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {loading ? <Skeleton className="h-full" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="receita" name="Receita" fill="hsl(var(--primary))" radius={[6,6,0,0]} />
                <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--destructive))" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-lg">Top despesas por categoria</CardTitle><CardDescription>{periodLabel}</CardDescription></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-40" /> : topExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma despesa no período.</p>
            ) : (
              <ul className="space-y-3">
                {topExpenses.map((e) => (
                  <li key={e.category} className="flex justify-between items-center">
                    <Badge variant="secondary">{e.category}</Badge>
                    <span className="font-medium tabular-nums">{brl(e.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Últimas vendas</CardTitle><CardDescription>{periodLabel}</CardDescription></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-40" /> : recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma venda no período.</p>
            ) : (
              <ul className="space-y-3">
                {recentSales.map((s) => (
                  <li key={s.id} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{new Date(s.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                    <span className="font-medium tabular-nums">{brl(Number(s.total))}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Assistente Financeiro</CardTitle>
          </div>
          <CardDescription>Pergunte sobre os dados da sua loja. As respostas usam apenas os seus dados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-xl bg-muted/30 h-80 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border'}`}>
                  {m.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown>{m.content || '…'}</ReactMarkdown>
                    </div>
                  ) : <p className="whitespace-pre-wrap">{m.content}</p>}
                </div>
              </div>
            ))}
            {streaming && <div className="flex justify-start"><div className="bg-card border rounded-2xl px-4 py-2 text-sm flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> pensando…</div></div>}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: Quanto vendi no mês passado?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              disabled={streaming}
            />
            <Button onClick={sendMessage} disabled={streaming || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Quanto vendi este mês?', 'Quais minhas maiores despesas?', 'Quais produtos têm estoque baixo?', 'Qual meu lucro nos últimos 3 meses?'].map((q) => (
              <button key={q} onClick={() => setInput(q)} disabled={streaming}
                className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-muted transition-colors disabled:opacity-50">
                {q}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ icon, label, value, loading, accent }: { icon: React.ReactNode; label: string; value: string; loading: boolean; accent?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className={accent ?? 'text-muted-foreground'}>{icon}</span>
        </div>
        {loading ? <Skeleton className="h-8 w-24" /> : (
          <p className={`text-2xl font-semibold tabular-nums ${accent ?? ''}`}>{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
