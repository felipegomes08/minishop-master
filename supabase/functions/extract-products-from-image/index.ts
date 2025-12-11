import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedProduct {
  name: string;
  quantity: number;
  unitPrice: number;
  description?: string;
}

interface SimilarProduct {
  id: string;
  name: string;
  price: number;
  stock: number | null;
  similarity: number;
}

interface ExtractedProductWithMatches extends ExtractedProduct {
  similarProducts: SimilarProduct[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      throw new Error('Imagem não fornecida');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('Processando imagem para extração de produtos...');

    // Call Lovable AI with vision capabilities
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente especializado em extrair informações de notas fiscais e pedidos de compra de joias e acessórios.
Analise a imagem fornecida e extraia a lista de produtos com suas quantidades, valores unitários e descrições resumidas.

IMPORTANTE:
- Extraia APENAS produtos válidos da nota/pedido
- O valor deve ser o preço UNITÁRIO, não o total
- Se houver quantidade, extraia corretamente
- Ignore cabeçalhos, totais, impostos, etc
- Para a DESCRIÇÃO, extraia detalhes como:
  - Tamanho (ex: TAM 18, TAM 23, TAM P/M/G)
  - Se é regulável
  - Se é conjunto, trio, par
  - Se é unissex
  - Material (se visível)
  - Formato bem resumido, máximo 30 caracteres
- Retorne SOMENTE o JSON, sem texto adicional

Retorne no formato JSON:
{
  "products": [
    { "name": "Anel Prata 925", "quantity": 10, "unitPrice": 25.50, "description": "TAM 18, Regulável" }
  ]
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extraia todos os produtos desta nota/pedido com nome, quantidade e valor unitário.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro na API de IA:', errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos à sua conta.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('Erro ao processar imagem com IA');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    console.log('Resposta da IA:', content);

    // Parse the JSON from AI response
    let extractedProducts: ExtractedProduct[] = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        extractedProducts = parsed.products || [];
      }
    } catch (parseError) {
      console.error('Erro ao fazer parse da resposta:', parseError);
      throw new Error('Não foi possível interpretar os produtos da imagem');
    }

    if (extractedProducts.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Nenhum produto encontrado na imagem. Certifique-se de que a imagem contém uma nota ou lista de produtos legível.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client to search for similar products
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find similar products for each extracted item
    const productsWithMatches: ExtractedProductWithMatches[] = await Promise.all(
      extractedProducts.map(async (product) => {
        // Search for similar products using ILIKE
        const searchTerms = product.name.toLowerCase().split(' ').filter(term => term.length > 2);
        
        let similarProducts: SimilarProduct[] = [];
        
        if (searchTerms.length > 0) {
          // Build search query - search for any term matching
          const searchPattern = searchTerms.map(term => `%${term}%`);
          
          const { data: matches } = await supabase
            .from('products')
            .select('id, name, price, stock')
            .or(searchPattern.map(p => `name.ilike.${p}`).join(','))
            .limit(5);

          if (matches && matches.length > 0) {
            // Calculate simple similarity score based on matching words
            similarProducts = matches.map(match => {
              const matchWords: string[] = match.name.toLowerCase().split(' ');
              const productWords: string[] = product.name.toLowerCase().split(' ');
              const matchingWords = productWords.filter((w: string) => 
                matchWords.some((mw: string) => mw.includes(w) || w.includes(mw))
              );
              const similarity = matchingWords.length / Math.max(productWords.length, 1);
              
              return {
                id: match.id,
                name: match.name,
                price: match.price,
                stock: match.stock,
                similarity: Math.round(similarity * 100)
              };
            }).sort((a, b) => b.similarity - a.similarity);
          }
        }

        return {
          ...product,
          similarProducts
        };
      })
    );

    console.log(`Extraídos ${productsWithMatches.length} produtos com matches`);

    return new Response(
      JSON.stringify({ products: productsWithMatches }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
