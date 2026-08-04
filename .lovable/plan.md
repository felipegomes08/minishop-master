# Correção das 3 brechas de segurança

## 1. Recuperação de senha por link (hoje qualquer um derruba a senha de qualquer conta)

Hoje o sistema gera uma senha temporária e **substitui a senha atual** de quem for informado no formulário. Basta saber o e-mail para bloquear o acesso de qualquer pessoa, inclusive o super admin.

Novo comportamento: o e-mail passa a conter um **link de redefinição com validade**. A senha só muda quando a pessoa abre o link e define a nova senha na tela `/reset-password`, que já existe. A resposta continua genérica (não revela se o e-mail existe) e o limite de 3 pedidos por hora é mantido.

## 2. Bloqueio de tentativas de login à prova de bypass

A função de guarda do login aceita hoje um aviso de "login concluído" sem qualquer verificação, e esse aviso zera o contador de tentativas. Qualquer pessoa pode chamá-lo e tentar senhas infinitamente.

Novo comportamento: o contador só é zerado quando a chamada apresenta uma sessão válida do próprio e-mail informado. Sem isso, o bloqueio de 5 tentativas por 15 minutos passa a valer de verdade.

## 3. Permissões de menu escopadas por empresa

A regra de acesso de `user_menu_permissions` verifica se a pessoa é admin no geral, e não se é admin **daquela** empresa. Alguém com marcação de admin global e vínculo com uma empresa consegue alterar permissões dela sem ser admin.

Novo comportamento: a verificação passa a ser por empresa, alinhada às demais tabelas do sistema.

## Detalhes técnicos

- `supabase/functions/reset-password/index.ts`: trocar `auth.admin.updateUserById({ password })` por `auth.admin.generateLink({ type: 'recovery', redirectTo: <origin>/reset-password })` e enviar o link no e-mail (mesmo layout, Resend). Manter rate limit e resposta genérica. `ResetPassword.tsx` já trata a sessão de recuperação — sem mudanças de layout.
- `supabase/functions/auth-guard/index.ts`: na ação `success`, validar o JWT do header `Authorization` via `auth.getClaims` e conferir se o e-mail do token bate com o e-mail enviado antes de chamar `resetRateLimit`. `src/pages/Auth.tsx` passa a enviar o token da sessão recém-criada nessa chamada.
- Migração: recriar a política "Company admins can manage menu permissions of their company" usando `has_company_role(auth.uid(), company_id, 'admin'::app_role)` no lugar de `has_role(auth.uid(), 'admin')`.
- Depois: redeploy das duas funções, teste do fluxo de login e de recuperação, e nova execução do scanner para confirmar o fechamento dos achados.

## Fora de escopo
CORS restrito por origem e a política de upload no papel `public` (itens médios do relatório) ficam para depois, conforme sua escolha.
