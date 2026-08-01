import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_expenses",
  title: "Listar despesas",
  description: "Lista as despesas da loja em um período, com título, categoria, valor e data.",
  inputSchema: {
    start_date: z.string().optional().describe("Data inicial AAAA-MM-DD."),
    end_date: z.string().optional().describe("Data final AAAA-MM-DD."),
    category: z.string().optional().describe("Filtro opcional por categoria."),
    limit: z.number().int().optional().describe("Máximo de despesas a retornar (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ start_date, end_date, category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("expenses")
      .select("id, title, category, amount, expense_date, payment_method, description")
      .order("expense_date", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 50, 1), 200));
    if (start_date) query = query.gte("expense_date", start_date);
    if (end_date) query = query.lte("expense_date", end_date);
    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { expenses: data ?? [] },
    };
  },
});
