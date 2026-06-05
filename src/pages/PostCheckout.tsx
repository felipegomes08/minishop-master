import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const PLAN_LABELS: Record<string, string> = {
  bronze: "Bronze",
  prata: "Prata",
  ouro: "Ouro",
};

export default function PostCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");
  const plan = searchParams.get("plan") || "";

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      toast.error("Sessão de pagamento não encontrada");
      navigate("/landing#precos");
    }
  }, [sessionId, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim() || !email.trim() || password.length < 6) {
      toast.error("Preencha todos os campos (senha mínima de 6 caracteres)");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/provision-company-from-checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            company_name: companyName.trim(),
            email: email.trim(),
            password,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao criar conta");

      if (data.already_provisioned) {
        toast.info(data.message || "Conta já criada. Faça login.");
        navigate("/auth");
        return;
      }

      setDone(true);
      toast.success("Conta criada! Redirecionando para o login...");
      setTimeout(() => navigate("/auth"), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao processar";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a] p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
            <h2 className="text-2xl font-bold">Tudo pronto!</h2>
            <p className="text-muted-foreground">
              Sua conta e empresa foram criadas. Redirecionando para o login...
            </p>
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a] p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
          <CardTitle className="text-2xl">Pagamento confirmado!</CardTitle>
          <CardDescription className="flex items-center justify-center gap-2 pt-1">
            <Crown size={14} className="text-amber-500" />
            Plano <strong>{PLAN_LABELS[plan] || plan}</strong> ativado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2 text-center">
            Seu <strong className="text-emerald-500">teste de 30 dias</strong> começou! Nenhuma cobrança será feita agora.
          </p>
          <p className="text-xs text-muted-foreground mb-6 text-center">
            Crie sua conta abaixo para acessar o painel.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">Nome da empresa</Label>
              <Input
                id="company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex: Minha Loja"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando sua conta...
                </>
              ) : (
                "Criar conta e acessar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
