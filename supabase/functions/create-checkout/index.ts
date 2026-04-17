import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PRICE_IDS: Record<string, string> = {
  bronze: "price_1TN0Z3ErrPM1M4J96bOpdsio",
  prata: "price_1TN0ZjErrPM1M4J9wS3XZ66P",
  ouro: "price_1TN0aDErrPM1M4J9iCwgM0Pg",
};

const log = (step: string, details?: unknown) => {
  console.log(`[CREATE-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY não configurada");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Usuário não autenticado");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Erro de autenticação: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("Usuário sem e-mail");
    log("Usuário autenticado", { userId: user.id, email: user.email });

    const { plan_tier } = await req.json();
    if (!plan_tier || !PRICE_IDS[plan_tier]) {
      throw new Error("plan_tier inválido. Use: bronze, prata ou ouro");
    }
    const priceId = PRICE_IDS[plan_tier];
    log("Plano selecionado", { plan_tier, priceId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Reutiliza customer existente, se houver
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;
    log("Customer Stripe", { customerId: customerId ?? "novo" });

    const origin = req.headers.get("origin") || "https://minishop-master.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${origin}/?checkout=success&plan=${plan_tier}`,
      cancel_url: `${origin}/landing#precos`,
      metadata: {
        user_id: user.id,
        plan_tier,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_tier,
        },
      },
    });

    log("Checkout session criada", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERRO", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
