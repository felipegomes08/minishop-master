import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PRICE_IDS: Record<string, string> = {
  bronze: "price_1TeJb9EyqBvKk747Co0MjbRB",
  prata: "price_1TeJb3EyqBvKk747yzJPeatO",
  ouro: "price_1TeJaxEyqBvKk747htNnpVqX",
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

    const { plan_tier, email } = await req.json();
    if (!plan_tier || !PRICE_IDS[plan_tier]) {
      throw new Error("plan_tier inválido. Use: bronze, prata ou ouro");
    }
    const priceId = PRICE_IDS[plan_tier];
    log("Plano selecionado", { plan_tier, priceId, email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Reutiliza customer existente, se houver
    let customerId: string | undefined;
    if (email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      customerId = customers.data[0]?.id;
      log("Customer Stripe encontrado", { customerId, email });
    }

    const origin = req.headers.get("origin") || "https://minishop-master.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${origin}/pos-pagamento?session_id={CHECKOUT_SESSION_ID}&plan=${plan_tier}`,
      cancel_url: `${origin}/landing#precos`,
      metadata: {
        plan_tier,
        ...(email && { email }),
      },
      subscription_data: {
        trial_period_days: 30,
        trial_settings: {
          end_behavior: { missing_payment_method: "cancel" },
        },
        metadata: {
          plan_tier,
          ...(email && { email }),
        },
      },


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
