import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PRICE_TO_TIER: Record<string, "bronze" | "prata" | "ouro"> = {
  price_1Tt50PEyqBvKk747ippyh6nT: "bronze",
  price_1Tt51rEyqBvKk747aHFviMwK: "prata",
  price_1Tt52fEyqBvKk7475EsqAMsb: "ouro",
};

const log = (step: string, details?: unknown) => {
  console.log(`[CHECK-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY não configurada");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Usuário não autenticado");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    if (userError) throw new Error(`Erro de autenticação: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("Usuário sem e-mail");
    log("Usuário autenticado", { userId: user.id });

    // Busca company do usuário
    const { data: companyId } = await supabaseService.rpc("get_user_company_id", {
      _user_id: user.id,
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      log("Nenhum customer Stripe encontrado");
      return new Response(
        JSON.stringify({ subscribed: false, plan_tier: null, subscription_end: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const customerId = customers.data[0].id;
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    const activeOrTrial = subs.data.find(
      (s) => s.status === "active" || s.status === "trialing"
    );

    if (!activeOrTrial) {
      log("Sem assinatura ativa ou em trial");
      return new Response(
        JSON.stringify({ subscribed: false, plan_tier: null, subscription_end: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const sub = activeOrTrial;

    const priceId = sub.items.data[0].price.id;
    const planTier = PRICE_TO_TIER[priceId] ?? null;
    const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

    log("Assinatura ativa", { planTier, periodEnd });

    // Sincroniza com tabela local (se houver company)
    if (companyId && planTier) {
      await supabaseService.from("subscriptions").upsert(
        {
          company_id: companyId,
          user_id: user.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          plan_tier: planTier,
          status: sub.status,
          current_period_end: periodEnd,
        },
        { onConflict: "stripe_subscription_id" }
      );
    }

    return new Response(
      JSON.stringify({
        subscribed: true,
        plan_tier: planTier,
        subscription_end: periodEnd,
        status: sub.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERRO", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
