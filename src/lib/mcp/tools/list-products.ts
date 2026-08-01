import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_products",
  title: "Listar produtos",
  description:
    "Lista os produtos da loja do usuário autenticado, com preço, custo e estoque. Permite busca por nome.",
  inputSchema: {
    search: z.string().optional().describe("Filtro opcional por nome do produto."),
    only_active: z.boolean().optional().describe("Se true, retorna apenas produtos ativos."),
    limit: z.number().int().optional().describe("Máximo de produtos a retornar (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, only_active, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("products")
      .select("id, name, price, promotional_price, cost_price, stock, is_active")
      .order("name")
      .limit(Math.min(Math.max(limit ?? 50, 1), 200));
    if (search) query = query.ilike("name", `%${search}%`);
    if (only_active) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { products: data ?? [] },
    };
  },
});
