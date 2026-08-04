import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  checkRateLimit,
  formatRetryAfter,
  getClientIp,
  resetRateLimit,
} from "../_shared/rate-limit.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOGIN_KEY = "login";
const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60;

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || email.length > 200 || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Email inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ip = getClientIp(req);
    const identifier = `${email}|${ip}`;

    // Login bem-sucedido: zera o contador APENAS com sessão válida do próprio e-mail
    if (action === "success") {
      const authHeader = req.headers.get("Authorization") ?? "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

      let tokenEmail = "";
      if (token && token !== anonKey) {
        const supabase = createClient(Deno.env.get("SUPABASE_URL")!, anonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data, error } = await supabase.auth.getUser(token);
        if (!error) {
          tokenEmail = String(data?.user?.email ?? "").trim().toLowerCase();
        }

      }

      if (!tokenEmail || tokenEmail !== email) {
        console.log("[auth-guard] reset de contador negado: sessão inválida");
        return new Response(
          JSON.stringify({ error: "Não autorizado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      await resetRateLimit(LOGIN_KEY, identifier);
      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    // Verificação antes da tentativa de login / recuperação de senha
    const isReset = action === "reset";
    const result = await checkRateLimit({
      key: isReset ? "reset-password" : LOGIN_KEY,
      identifier,
      ip,
      max: isReset ? 3 : MAX_ATTEMPTS,
      windowSeconds: isReset ? 60 * 60 : WINDOW_SECONDS,
    });

    if (!result.allowed) {
      console.log("[auth-guard] bloqueado por rate limit", { ip, action });
      return new Response(
        JSON.stringify({
          allowed: false,
          retry_after: result.retryAfter,
          error: isReset
            ? `Muitas solicitações de recuperação de senha. Tente novamente em ${formatRetryAfter(result.retryAfter)}.`
            : `Muitas tentativas de login. Tente novamente em ${formatRetryAfter(result.retryAfter)}.`,
        }),

        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(Math.max(1, result.retryAfter)),
          },
        },
      );
    }

    return new Response(
      JSON.stringify({ allowed: true, remaining: result.remaining }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[auth-guard] erro:", err);
    // Fail-open para não travar o login em caso de falha interna
    return new Response(
      JSON.stringify({ allowed: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
