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
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const prompt = `You are a business analyst AI. Based on the following store data, provide 3-5 brief, actionable insights. Each insight should have a title (max 5 words), description (max 30 words), and type (success, warning, or info).

Store Statistics:
- Total Revenue: $${stats.totalRevenue || 0}
- Total Sales: ${stats.totalSales || 0}
- Best Selling Products: ${JSON.stringify(stats.bestSellingProducts || [])}
- Top Customers: ${JSON.stringify(stats.topCustomers || [])}

Product Inventory:
${JSON.stringify(products || [], null, 2)}

Respond ONLY with a valid JSON array in this exact format:
[{"title": "...", "description": "...", "type": "success|warning|info"}]

Focus on:
- Products with high turnover (success)
- Low stock items needing restock (warning)
- Business recommendations (info)
- Revenue patterns (success/info)`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a helpful business analyst. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          insights: [{ title: 'Rate Limited', description: 'Please try again in a moment.', type: 'warning' }] 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
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
      console.error('Error parsing AI response:', parseError);
      insights = [
        { title: 'Analysis Complete', description: 'Add more sales data for detailed insights.', type: 'info' }
      ];
    }

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in generate-insights:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      insights: [{ title: 'Welcome!', description: 'Start adding products and sales to get insights.', type: 'info' }]
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
