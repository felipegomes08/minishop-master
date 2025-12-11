import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userPhoto, productImage, productName, productCategory } = await req.json();

    if (!userPhoto || !productImage) {
      return new Response(
        JSON.stringify({ error: 'Foto do usuário e imagem do produto são obrigatórias' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construir prompt baseado no tipo de produto
    const prompt = buildPrompt(productName, productCategory);

    console.log('Iniciando geração de imagem virtual try-on para:', productName);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: { url: userPhoto }
              },
              {
                type: 'image_url',
                image_url: { url: productImage }
              }
            ]
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro da API Lovable AI:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Muitas requisições. Por favor, aguarde um momento e tente novamente.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Limite de uso atingido. Entre em contato com o suporte.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Erro ao processar a imagem. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Resposta recebida da API');

    // Extrair a imagem gerada
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!generatedImage) {
      console.error('Nenhuma imagem gerada na resposta:', JSON.stringify(data).substring(0, 500));
      return new Response(
        JSON.stringify({ error: 'Não foi possível gerar a visualização. Tente outra foto.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Imagem gerada com sucesso');

    return new Response(
      JSON.stringify({ 
        generatedImage,
        message: 'Visualização gerada com sucesso!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no virtual-try-on:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno. Tente novamente mais tarde.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildPrompt(productName: string, productCategory?: string): string {
  const basePrompt = `Você é um especialista em edição de imagens de moda. Sua tarefa é adicionar o acessório/produto da SEGUNDA imagem na pessoa da PRIMEIRA imagem.

REGRAS CRÍTICAS:
1. MANTENHA a pessoa da primeira imagem EXATAMENTE como está - rosto, corpo, pose, roupas, cabelo, maquiagem, fundo
2. APENAS ADICIONE o produto/acessório de forma natural e realista
3. A iluminação e proporção do produto deve combinar com a foto da pessoa
4. O resultado deve parecer uma foto real, não uma montagem

PRODUTO: ${productName}
`;

  // Dicas específicas por categoria
  const categoryLower = (productCategory || '').toLowerCase();
  
  if (categoryLower.includes('colar') || categoryLower.includes('gargantilha') || categoryLower.includes('corrente')) {
    return basePrompt + '\nPOSICIONAMENTO: Coloque o colar/corrente no pescoço da pessoa de forma natural, respeitando o decote da roupa.';
  }
  
  if (categoryLower.includes('anel')) {
    return basePrompt + '\nPOSICIONAMENTO: Coloque o anel no dedo da pessoa. Se a mão não estiver visível, posicione de forma criativa mas realista.';
  }
  
  if (categoryLower.includes('brinco')) {
    return basePrompt + '\nPOSICIONAMENTO: Coloque o brinco na orelha da pessoa de forma natural.';
  }
  
  if (categoryLower.includes('pulseira') || categoryLower.includes('bracelete')) {
    return basePrompt + '\nPOSICIONAMENTO: Coloque a pulseira/bracelete no pulso da pessoa.';
  }
  
  if (categoryLower.includes('roupa') || categoryLower.includes('blusa') || categoryLower.includes('camisa') || categoryLower.includes('vestido')) {
    return basePrompt + '\nPOSICIONAMENTO: Substitua a roupa atual da pessoa pela roupa do produto, mantendo a pose e proporções.';
  }
  
  if (categoryLower.includes('sapato') || categoryLower.includes('tênis') || categoryLower.includes('sandália')) {
    return basePrompt + '\nPOSICIONAMENTO: Coloque o calçado nos pés da pessoa de forma natural.';
  }

  return basePrompt + '\nPOSICIONAMENTO: Adicione o produto na pessoa de forma natural e apropriada ao tipo de produto.';
}
