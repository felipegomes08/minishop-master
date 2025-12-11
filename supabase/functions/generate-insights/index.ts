import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { stats, products } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não está configurada');
    }

    const prompt = `Você é um analista de negócios com IA. Com base nos seguintes dados da loja, forneça de 3 a 5 insights breves e acionáveis. Cada insight deve ter um título (máximo 5 palavras), descrição (máximo 30 palavras) e tipo (success, warning ou info).

Estatísticas da Loja:
- Receita Total: R$${stats.totalRevenue || 0}
- Total de Vendas: ${stats.totalSales || 0}
- Produtos Mais Vendidos: ${JSON.stringify(stats.bestSellingProducts || [])}
- Melhores Clientes: ${JSON.stringify(stats.topCustomers || [])}

Inventário de Produtos:
${JSON.stringify(products || [], null, 2)}

Responda APENAS com um array JSON válido neste formato exato:
[{"title": "...", "description": "...", "type": "success|warning|info"}]

Foque em:
- Produtos com alta rotatividade (success)
- Itens com baixo estoque precisando reposição (warning)
- Recomendações de negócio (info)
- Padrões de receita (success/info)

IMPORTANTE: Responda em português brasileiro.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um analista de negócios útil. Sempre responda em português brasileiro com JSON válido apenas.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro no gateway de IA:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          insights: [{ title: 'Limite Atingido', description: 'Por favor, tente novamente em instantes.', type: 'warning' }] 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Erro no gateway de IA: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse the JSON response
    let insights = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Erro ao analisar resposta da IA:', parseError);
      insights = [
        { title: 'Análise Completa', description: 'Adicione mais dados de vendas para insights detalhados.', type: 'info' }
      ];
    }

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Erro em generate-insights:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      insights: [{ title: 'Bem-vindo!', description: 'Comece adicionando produtos e vendas para receber insights.', type: 'info' }]
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
