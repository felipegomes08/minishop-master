import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    // Authenticate user
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Resolve company strictly from JWT (ignore client input)
    const { data: companyId } = await admin.rpc("get_user_company_id", { _user_id: userId });
    if (!companyId) {
      return new Response(JSON.stringify({ error: "Empresa não encontrada" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Plan check: Prata or Ouro
    const { data: companyRow } = await admin
      .from("companies")
      .select("plan_tier, plan_status, name")
      .eq("id", companyId)
      .single();
    const tier = companyRow?.plan_tier;
    if (tier !== "prata" && tier !== "ouro") {
      return new Response(JSON.stringify({ error: "Recurso disponível apenas nos planos Prata e Ouro." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = (await req.json()) as { messages: ChatMessage[] };
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Mensagens obrigatórias" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build snapshot — last 12 months
    const now = new Date();
    const start12 = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString();

    const [salesRes, expensesRes, productsRes, customersRes, saleItemsRes] = await Promise.all([
      admin.from("sales").select("total, created_at, status").eq("company_id", companyId).gte("created_at", start12),
      admin.from("expenses").select("amount, category, expense_date").eq("company_id", companyId).gte("expense_date", start12.slice(0, 10)),
      admin.from("products").select("id, name, stock, price, is_active").eq("company_id", companyId),
      admin.from("customers").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      admin.from("sale_items").select("product_name, quantity, total_price, sales!inner(company_id, created_at)").eq("sales.company_id", companyId).gte("sales.created_at", start12),
    ]);

    const sales = salesRes.data ?? [];
    const expenses = expensesRes.data ?? [];
    const products = productsRes.data ?? [];
    const items = (saleItemsRes.data as any[]) ?? [];

    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const months: Record<string, { revenue: number; salesCount: number; expenses: number }> = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months[monthKey(d)] = { revenue: 0, salesCount: 0, expenses: 0 };
    }
    for (const s of sales) {
      const k = monthKey(new Date(s.created_at));
      if (months[k]) {
        months[k].revenue += Number(s.total) || 0;
        months[k].salesCount += 1;
      }
    }
    for (const e of expenses) {
      const k = monthKey(new Date(e.expense_date));
      if (months[k]) months[k].expenses += Number(e.amount) || 0;
    }

    const expensesByCategory: Record<string, number> = {};
    for (const e of expenses) {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + (Number(e.amount) || 0);
    }

    const productSales: Record<string, { qty: number; revenue: number }> = {};
    for (const it of items) {
      const k = it.product_name;
      if (!productSales[k]) productSales[k] = { qty: 0, revenue: 0 };
      productSales[k].qty += Number(it.quantity) || 0;
      productSales[k].revenue += Number(it.total_price) || 0;
    }
    const topProducts = Object.entries(productSales)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 5)
      .map(([name, v]) => ({ name, ...v }));

    const totalProducts = products.filter((p) => p.is_active).length;
    const totalStock = products.reduce((acc, p) => acc + (p.stock ?? 0), 0);
    const lowStock = products.filter((p) => p.is_active && (p.stock ?? 0) > 0 && (p.stock ?? 0) < 5).length;

    const snapshot = {
      empresa: companyRow?.name,
      moeda: "BRL",
      hoje: now.toISOString().slice(0, 10),
      ultimos_12_meses: months,
      despesas_por_categoria: expensesByCategory,
      top_produtos_vendidos: topProducts,
      produtos_ativos: totalProducts,
      estoque_total: totalStock,
      produtos_estoque_baixo: lowStock,
      total_clientes: customersRes.count ?? 0,
    };

    const systemPrompt = `Você é o Assistente Financeiro da loja "${companyRow?.name}".
Responda APENAS com base no JSON de dados desta loja fornecido abaixo. NUNCA invente números nem use dados externos.
Se a pergunta não puder ser respondida com os dados fornecidos, diga educadamente que não há essa informação disponível.
Recuse perguntas fora do escopo financeiro/operacional desta loja (ex: clima, notícias, política, código).
Sempre responda em português brasileiro. Formate valores em BRL (R$ 1.234,56). Use markdown e seja conciso.

DADOS DA LOJA (JSON):
${JSON.stringify(snapshot, null, 2)}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas solicitações. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Contate o suporte." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "Erro no provedor de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("financial-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
