import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    const { target_user_id } = await req.json();
    if (!target_user_id || typeof target_user_id !== "string") {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (target_user_id === callerId) {
      return new Response(
        JSON.stringify({ error: "Você não pode excluir a si mesmo" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

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

    const { count: callerPermCount } = await admin
      .from("user_menu_permissions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", callerId)
      .eq("company_id", companyId);

    if ((callerPermCount ?? 0) > 0) {
      return new Response(
        JSON.stringify({ error: "Apenas o proprietario da empresa pode excluir usuarios" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Confirma que o alvo pertence à mesma empresa
    const { data: targetMembership } = await admin
      .from("company_users")
      .select("id, company_id")
      .eq("user_id", target_user_id)
      .maybeSingle();

    if (!targetMembership || targetMembership.company_id !== companyId) {
      return new Response(
        JSON.stringify({ error: "Usuário não pertence à sua empresa" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Confirma que o alvo é restrito (tem entradas em user_menu_permissions)
    // Para evitar que admin exclua o dono original
    const { count: permCount } = await admin
      .from("user_menu_permissions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", target_user_id);

    if (!permCount || permCount === 0) {
      return new Response(
        JSON.stringify({ error: "Não é possível excluir o dono da empresa" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Limpa vínculos e remove usuário
    await admin.from("user_menu_permissions").delete().eq("user_id", target_user_id);
    await admin.from("user_roles").delete().eq("user_id", target_user_id);
    await admin.from("company_users").delete().eq("user_id", target_user_id);
    const { error: delErr } = await admin.auth.admin.deleteUser(target_user_id);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("delete-company-user error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
