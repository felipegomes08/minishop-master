import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLAN_LIMITS: Record<string, number> = {
  bronze: 1,
  prata: 3,
  ouro: 10,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const body = await req.json();
    const { name, email, password, menu_keys } = body as {
      name?: string;
      email?: string;
      password?: string;
      menu_keys?: string[];
    };

    if (!name || !email || !password || !Array.isArray(menu_keys)) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Senha deve ter no mínimo 8 caracteres" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validar admin + empresa ativa
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: companyId } = await admin.rpc("get_user_company_id", {
      _user_id: callerId,
    });
    if (!companyId) {
      return new Response(JSON.stringify({ error: "Empresa não encontrada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: company } = await admin
      .from("companies")
      .select("plan_tier, is_active")
      .eq("id", companyId)
      .maybeSingle();

    if (!company || !company.is_active) {
      return new Response(JSON.stringify({ error: "Empresa inativa" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const limit = PLAN_LIMITS[company.plan_tier ?? "bronze"] ?? 1;

    const { count } = await admin
      .from("company_users")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);

    if ((count ?? 0) >= limit) {
      return new Response(
        JSON.stringify({
          error: `Limite do plano atingido (${limit} usuário${limit > 1 ? "s" : ""}). Faça upgrade para adicionar mais.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Criar usuário
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (createErr || !created.user) {
      return new Response(
        JSON.stringify({ error: createErr?.message ?? "Erro ao criar usuário" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const newUserId = created.user.id;

    // Vínculos
    const { error: cuErr } = await admin.from("company_users").insert({
      user_id: newUserId,
      company_id: companyId,
      role: "user",
    });
    if (cuErr) {
      await admin.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: cuErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("user_roles").insert({
      user_id: newUserId,
      role: "admin",
    });

    // Permissões de menu (sempre garante dashboard)
    const finalMenus = Array.from(new Set([...menu_keys, "dashboard"]));
    const permRows = finalMenus.map((mk) => ({
      user_id: newUserId,
      company_id: companyId,
      menu_key: mk,
    }));
    if (permRows.length > 0) {
      await admin.from("user_menu_permissions").insert(permRows);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUserId, email }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("create-company-user error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
