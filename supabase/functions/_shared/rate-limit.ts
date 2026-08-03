import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
  limit: number;
}

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** Extrai o IP real do visitante a partir dos headers do proxy. */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown";
}

/**
 * Consulta e registra uma tentativa. Se o limite for excedido, `allowed` é false.
 * Em caso de erro no banco, libera a requisição (fail-open) para não derrubar o app.
 */
export async function checkRateLimit(opts: {
  key: string;
  identifier: string;
  ip?: string | null;
  max: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  try {
    const { data, error } = await adminClient().rpc("check_rate_limit", {
      _key: opts.key,
      _identifier: opts.identifier.toLowerCase().slice(0, 200),
      _ip: opts.ip ?? null,
      _max: opts.max,
      _window_seconds: opts.windowSeconds,
    });

    if (error || !data) {
      console.error("[rate-limit] erro ao verificar limite:", error);
      return { allowed: true, remaining: opts.max, retryAfter: 0, limit: opts.max };
    }

    const d = data as Record<string, number | boolean>;
    return {
      allowed: d.allowed === true,
      remaining: Number(d.remaining ?? 0),
      retryAfter: Number(d.retry_after ?? 0),
      limit: Number(d.limit ?? opts.max),
    };
  } catch (err) {
    console.error("[rate-limit] exceção:", err);
    return { allowed: true, remaining: opts.max, retryAfter: 0, limit: opts.max };
  }
}

/** Zera o contador (ex.: após um login bem-sucedido). */
export async function resetRateLimit(key: string, identifier: string): Promise<void> {
  try {
    await adminClient().rpc("reset_rate_limit", {
      _key: key,
      _identifier: identifier.toLowerCase().slice(0, 200),
    });
  } catch (err) {
    console.error("[rate-limit] erro ao resetar:", err);
  }
}

/** Formata o tempo restante em texto pt-BR amigável. */
export function formatRetryAfter(seconds: number): string {
  if (seconds <= 60) return `${Math.max(1, seconds)} segundos`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minuto${minutes > 1 ? "s" : ""}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hora${hours > 1 ? "s" : ""}`;
}

/** Resposta padrão 429 em pt-BR, já com CORS e Retry-After. */
export function tooManyRequests(
  result: RateLimitResult,
  corsHeaders: Record<string, string>,
  message?: string,
): Response {
  return new Response(
    JSON.stringify({
      error: message ??
        `Muitas tentativas. Tente novamente em ${formatRetryAfter(result.retryAfter)}.`,
      retry_after: result.retryAfter,
      rate_limited: true,
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
