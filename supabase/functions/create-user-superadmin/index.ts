import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRateLimit, getClientIp, tooManyRequests } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Sessão inválida" }, 401);
    const callerId = userData.user.id;

    const { data: isSuper } = await admin.rpc("is_super_admin", {
      _user_id: callerId,
    });
    if (!isSuper) return json({ error: "Sem permissão" }, 403);

    const rl = await checkRateLimit({
      key: "create-user-superadmin",
      identifier: callerId,
      ip: getClientIp(req),
      max: 20,
      windowSeconds: 60 * 60,
    });
    if (!rl.allowed) {
      return tooManyRequests(rl, corsHeaders, "Muitas operações em pouco tempo. Aguarde alguns minutos.");
    }

    const body = await req.json().catch(() => ({}));
    const { name, email, password, company_id, role } = body as {
      name?: string;
      email?: string;
      password?: string;
      company_id?: string;
      role?: string;
    };

    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const finalRole = role === "user" ? "user" : "admin";

    if (!cleanName) return json({ error: "Nome é obrigatório" }, 400);
    if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      return json({ error: "E-mail inválido" }, 400);
    }
    if (!password || password.length < 8) {
      return json({ error: "Senha deve ter no mínimo 8 caracteres" }, 400);
    }
    if (!company_id) return json({ error: "Empresa é obrigatória" }, 400);

    const { data: company } = await admin
      .from("companies")
      .select("id")
      .eq("id", company_id)
      .maybeSingle();
    if (!company) return json({ error: "Empresa não encontrada" }, 400);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { name: cleanName },
    });
    if (createErr || !created.user) {
      const msg = createErr?.message ?? "Erro ao criar usuário";
      const already = /already|registered|exists/i.test(msg);
      return json({ error: already ? "Já existe um usuário com este e-mail" : msg }, 400);
    }
    const newUserId = created.user.id;

    const { error: cuErr } = await admin.from("company_users").insert({
      user_id: newUserId,
      company_id,
      role: finalRole,
    });
    if (cuErr) {
      await admin.auth.admin.deleteUser(newUserId);
      return json({ error: cuErr.message }, 400);
    }

    const { error: roleErr } = await admin.from("user_roles").insert({
      user_id: newUserId,
      role: "admin",
    });
    if (roleErr) {
      await admin.from("company_users").delete().eq("user_id", newUserId);
      await admin.auth.admin.deleteUser(newUserId);
      return json({ error: roleErr.message }, 400);
    }

    return json({ success: true, user_id: newUserId, email: cleanEmail });
  } catch (e) {
    console.error("create-user-superadmin error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
