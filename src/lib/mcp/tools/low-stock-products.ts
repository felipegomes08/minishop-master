import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "low_stock_products",
  title: "Produtos com estoque baixo",
  description:
    "Lista os produtos ativos da loja cujo estoque está abaixo de um limite (padrão: 5 unidades).",
  inputSchema: {
    threshold: z.number().int().optional().describe("Limite de estoque considerado baixo (padrão 5)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ threshold }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const limitValue = threshold ?? 5;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("products")
      .select("id, name, stock, price")
      .eq("is_active", true)
      .lt("stock", limitValue)
      .order("stock");

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { threshold: limitValue, products: data ?? [] },
    };
  },
});
