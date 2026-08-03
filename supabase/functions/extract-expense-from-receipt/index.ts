import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getClientIp, tooManyRequests } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ExtractedExpense = {
  title: string;
  amount: number;
  expenseDate: string | null;
  vendor: string | null;
  category: string;
  paymentMethod: string;
  description: string | null;
};

const fallbackExpense: ExtractedExpense = {
  title: "Despesa importada da notinha",
  amount: 0,
  expenseDate: null,
  vendor: null,
  category: "Outros",
  paymentMethod: "Outros",
  description: null,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "Imagem não fornecida." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const receiptIp = getClientIp(req);
    const rl = await checkRateLimit({
      key: "extract-expense",
      identifier: receiptIp,
      ip: receiptIp,
      max: 20,
      windowSeconds: 60 * 60,
    });
    if (!rl.allowed) {
      return tooManyRequests(rl, corsHeaders, "Muitas leituras de comprovante em pouco tempo. Aguarde alguns minutos.");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("Lovable AI não está configurado.");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você extrai dados de comprovantes, recibos e notas fiscais brasileiras para cadastro de despesas.
Use pt-BR. Extraia o valor TOTAL pago, data da compra, fornecedor/estabelecimento, categoria sugerida, forma de pagamento e uma descrição curta.
Categorias permitidas: Compra de produtos, Aluguel, Marketing, Taxas, Transporte, Embalagens, Serviços, Alimentação, Outros.
Formas de pagamento permitidas: Pix, Dinheiro, Cartão, Boleto, Transferência, Outros.
Se a data não estiver clara, retorne null. Se a forma de pagamento não estiver clara, use Outros.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Leia esta notinha e extraia os dados para cadastrar uma despesa." },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_expense",
              description: "Retorna os dados extraídos de uma notinha para cadastro de despesa.",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  amount: { type: "number" },
                  expenseDate: { type: ["string", "null"], description: "Data em YYYY-MM-DD ou null." },
                  vendor: { type: ["string", "null"] },
                  category: { type: "string" },
                  paymentMethod: { type: "string" },
                  description: { type: ["string", "null"] },
                },
                required: ["title", "amount", "expenseDate", "vendor", "category", "paymentMethod", "description"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_expense" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Erro no Lovable AI:", aiResponse.status, errorText);

      const message = aiResponse.status === 429
        ? "Limite de leitura com IA atingido. Tente novamente em alguns segundos."
        : aiResponse.status === 402
          ? "Créditos de IA insuficientes para ler a notinha."
          : "Não foi possível ler a notinha agora.";

      return new Response(JSON.stringify({ error: message }), {
        status: aiResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    const extracted = args ? JSON.parse(args) : fallbackExpense;

    return new Response(JSON.stringify({ expense: { ...fallbackExpense, ...extracted } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro ao extrair despesa:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});