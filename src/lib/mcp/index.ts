import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getStoreInfoTool from "./tools/get-store-info";
import listCustomersTool from "./tools/list-customers";
import listExpensesTool from "./tools/list-expenses";
import listProductsTool from "./tools/list-products";
import lowStockProductsTool from "./tools/low-stock-products";
import salesSummaryTool from "./tools/sales-summary";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "lojix",
  title: "Lojix",
  version: "0.1.0",
  instructions:
    "Ferramentas do Lojix, um SaaS de gestão de loja (produtos, vendas, despesas, clientes e catálogo). " +
    "Todas as ferramentas operam apenas sobre os dados da loja do usuário autenticado. " +
    "Valores monetários estão em BRL. Responda em português brasileiro.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getStoreInfoTool,
    listProductsTool,
    lowStockProductsTool,
    listCustomersTool,
    listExpensesTool,
    salesSummaryTool,
  ],
});
