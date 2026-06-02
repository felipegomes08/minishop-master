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

    const body = await req.json();
    const { target_user_id, name, email, password, menu_keys } = body as {
      target_user_id?: string;
      name?: string;
      email?: string;
      password?: string;
      menu_keys?: string[];
    };

    if (!target_user_id) {
      return new Response(JSON.stringify({ error: "Usuário alvo ausente" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (password && password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Senha deve ter no mínimo 8 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

    // Garante que o alvo é membro da MESMA empresa
    const { data: targetMembership } = await admin
      .from("company_users")
      .select("id, company_id")
      .eq("user_id", target_user_id)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!targetMembership) {
      return new Response(
        JSON.stringify({ error: "Usuário não pertence à sua empresa" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Atualizar auth (nome/email/senha)
    const updates: Record<string, unknown> = {};
    if (typeof email === "string" && email.trim()) updates.email = email.trim().toLowerCase();
    if (typeof password === "string" && password.length > 0) updates.password = password;
    if (typeof name === "string") {
      updates.user_metadata = { name: name.trim() };
    }
    if (Object.keys(updates).length > 0) {
      const { error: updErr } = await admin.auth.admin.updateUserById(
        target_user_id,
        updates,
      );
      if (updErr) {
        return new Response(JSON.stringify({ error: updErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Atualizar menus (se enviado) — preserva "proprietário": só altera se já houver alguma entrada OU se menu_keys vier
    if (Array.isArray(menu_keys)) {
      await admin
        .from("user_menu_permissions")
        .delete()
        .eq("user_id", target_user_id)
        .eq("company_id", companyId);

      const finalMenus = Array.from(new Set([...menu_keys, "dashboard"]));
      const rows = finalMenus.map((mk) => ({
        user_id: target_user_id,
        company_id: companyId,
        menu_key: mk,
      }));
      if (rows.length > 0) {
        await admin.from("user_menu_permissions").insert(rows);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("update-company-user error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
