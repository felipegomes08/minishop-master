import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Iniciando reset de senha para:", email);

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Find user by email
    const { data: userData, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("Erro ao listar usuários:", listError);
      return new Response(
        JSON.stringify({ error: "Erro interno do servidor" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      // Don't reveal if email exists or not for security
      console.log("Usuário não encontrado, mas retornando sucesso por segurança");
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();
    console.log("Senha temporária gerada");

    // Update user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: tempPassword
    });

    if (updateError) {
      console.error("Erro ao atualizar senha:", updateError);
      return new Response(
        JSON.stringify({ error: "Não foi possível redefinir a senha" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Senha atualizada no banco");

    // Send email with new password
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.error("RESEND_API_KEY não configurada");
      return new Response(
        JSON.stringify({ error: "Serviço de email não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    const { error: emailError } = await resend.emails.send({
      from: "Shine 925 Pratas <onboarding@resend.dev>",
      to: [email],
      subject: "Sua nova senha temporária - Shine 925 Pratas",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1e293b; margin-bottom: 20px;">Recuperação de Senha</h1>
          <p style="color: #64748b; font-size: 16px; line-height: 1.6;">
            Olá,
          </p>
          <p style="color: #64748b; font-size: 16px; line-height: 1.6;">
            Recebemos uma solicitação para redefinir sua senha. Use a senha temporária abaixo para acessar o sistema:
          </p>
          <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
            <code style="font-size: 24px; font-weight: bold; color: #1e293b; letter-spacing: 2px;">${tempPassword}</code>
          </div>
          <p style="color: #64748b; font-size: 16px; line-height: 1.6;">
            <strong>Importante:</strong> Recomendamos que você altere esta senha assim que fizer login.
          </p>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 32px;">
            Se você não solicitou a redefinição de senha, ignore este email ou entre em contato conosco.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">
            Shine 925 Pratas - Painel Administrativo
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Erro ao enviar email:", emailError);
      return new Response(
        JSON.stringify({ error: "Senha redefinida, mas falha ao enviar email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email enviado com sucesso");

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Erro no reset-password:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
