import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "sales_summary",
  title: "Resumo de vendas",
  description:
    "Resumo financeiro da loja em um período: total de vendas, receita, despesas, lucro e produtos mais vendidos.",
  inputSchema: {
    start_date: z.string().describe("Data inicial no formato AAAA-MM-DD."),
    end_date: z.string().describe("Data final no formato AAAA-MM-DD."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ start_date, end_date }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const startIso = `${start_date}T00:00:00.000Z`;
    const endIso = `${end_date}T23:59:59.999Z`;

    const [salesRes, expensesRes, itemsRes] = await Promise.all([
      supabase.from("sales").select("id, total, created_at").gte("created_at", startIso).lte("created_at", endIso),
      supabase.from("expenses").select("amount, category").gte("expense_date", start_date).lte("expense_date", end_date),
      supabase
        .from("sale_items")
        .select("product_name, quantity, total_price, sales!inner(created_at)")
        .gte("sales.created_at", startIso)
        .lte("sales.created_at", endIso),
    ]);

    const firstError = salesRes.error ?? expensesRes.error ?? itemsRes.error;
    if (firstError) return { content: [{ type: "text", text: firstError.message }], isError: true };

    const sales = salesRes.data ?? [];
    const expenses = expensesRes.data ?? [];
    const items = (itemsRes.data ?? []) as Array<{ product_name: string; quantity: number; total_price: number }>;

    const revenue = sales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    const byCategory: Record<string, number> = {};
    for (const e of expenses) byCategory[e.category] = (byCategory[e.category] ?? 0) + (Number(e.amount) || 0);

    const byProduct: Record<string, { quantidade: number; receita: number }> = {};
    for (const it of items) {
      const entry = (byProduct[it.product_name] ??= { quantidade: 0, receita: 0 });
      entry.quantidade += Number(it.quantity) || 0;
      entry.receita += Number(it.total_price) || 0;
    }
    const topProdutos = Object.entries(byProduct)
      .sort((a, b) => b[1].quantidade - a[1].quantidade)
      .slice(0, 10)
      .map(([nome, v]) => ({ nome, ...v }));

    const summary = {
      periodo: { inicio: start_date, fim: end_date },
      moeda: "BRL",
      total_vendas: sales.length,
      receita: revenue,
      despesas: totalExpenses,
      lucro: revenue - totalExpenses,
      despesas_por_categoria: byCategory,
      top_produtos: topProdutos,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
