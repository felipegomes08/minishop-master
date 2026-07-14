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
  console.log(`[PROVISION-COMPANY] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY não configurada");

    const { session_id, company_name, email, password } = await req.json();

    if (!session_id || !company_name || !email || !password) {
      throw new Error("Dados obrigatórios: session_id, company_name, email, password");
    }
    if (password.length < 6) throw new Error("Senha deve ter no mínimo 6 caracteres");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // 1. Verifica session no Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["subscription"],
    });
    log("Session recuperada", { sessionId: session.id, status: session.payment_status });

    // Aceita pagamento confirmado OU trial (no_payment_required)
    if (
      session.payment_status !== "paid" &&
      session.payment_status !== "no_payment_required"
    ) {
      throw new Error("Pagamento não confirmado no Stripe");
    }


    const subscription = session.subscription as Stripe.Subscription | null;
    if (!subscription) throw new Error("Assinatura não encontrada na sessão");

    const priceId = subscription.items.data[0].price.id;
    const planTier = PRICE_TO_TIER[priceId];
    if (!planTier) throw new Error(`Price ID desconhecido: ${priceId}`);

    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
    if (!customerId) throw new Error("Customer ID não encontrado");

    // 2. Cria Supabase admin client
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // 3. Verifica se já existe subscription para essa session/customer (idempotência)
    const { data: existingSub } = await admin
      .from("subscriptions")
      .select("id, company_id")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();

    if (existingSub) {
      log("Empresa já provisionada para essa assinatura", { companyId: existingSub.company_id });
      return new Response(
        JSON.stringify({
          already_provisioned: true,
          message: "Esta assinatura já foi vinculada a uma empresa. Faça login.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 4. Cria usuário no Auth
    const { data: userData, error: userErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (userErr) throw new Error(`Erro ao criar usuário: ${userErr.message}`);
    const userId = userData.user.id;
    log("Usuário criado", { userId, email });

    // 5. Cria empresa (slug único)
    const baseSlug = generateSlug(company_name);
    let slug = baseSlug;
    let attempt = 1;
    while (true) {
      const { data: existing } = await admin
        .from("companies")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

    const { data: company, error: compErr } = await admin
      .from("companies")
      .insert({
        name: company_name,
        slug,
        is_active: true,
        plan_tier: planTier,
        plan_status: subscription.status,
        plan_source: "stripe",
        subscription_end: periodEnd,
      })
      .select()
      .single();
    if (compErr) throw new Error(`Erro ao criar empresa: ${compErr.message}`);
    log("Empresa criada", { companyId: company.id, slug });

    // 6. Vincula usuário à empresa
    const { error: cuErr } = await admin.from("company_users").insert({
      user_id: userId,
      company_id: company.id,
      role: "admin",
    });
    if (cuErr) throw new Error(`Erro ao vincular usuário à empresa: ${cuErr.message}`);

    // 7. Atribui role admin
    const { error: roleErr } = await admin.from("user_roles").insert({
      user_id: userId,
      role: "admin",
    });
    if (roleErr) throw new Error(`Erro ao atribuir role: ${roleErr.message}`);

    // 8. Cria subscription (trigger atualiza companies, mas plan_source já é 'stripe')
    const { error: subErr } = await admin.from("subscriptions").insert({
      company_id: company.id,
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan_tier: planTier,
      status: subscription.status,
      current_period_end: periodEnd,
    });
    if (subErr) throw new Error(`Erro ao criar subscription: ${subErr.message}`);

    log("Provisionamento completo", { companyId: company.id, userId, planTier });

    return new Response(
      JSON.stringify({
        success: true,
        company_id: company.id,
        company_slug: slug,
        plan_tier: planTier,
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
