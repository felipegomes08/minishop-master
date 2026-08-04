# Checkup de segurança — resultado e correções propostas

## O que está OK (verificado)

- Nenhuma chave secreta no código do frontend: não há `sk_live/sk_test`, service role key, chave Resend ou chave Google no `src/`.
- Todas as funções de backend leem segredos via variáveis de ambiente (`Deno.env.get`), nunca hardcoded.
- O `.env` do projeto contém apenas valores públicos por design (URL do backend, chave publicável e número de suporte) — esses são feitos para rodar no navegador e são protegidos por RLS.
- Os IDs de preço do Stripe (`price_...`) no backend são identificadores públicos, não segredos.
- Rate limit já ativo em login, recuperação de senha, provador virtual, chat financeiro, importação por foto e checkout.

## Problemas encontrados (por prioridade)

### 1. Escalada de privilégio em permissões de menu (crítico)
A política de `user_menu_permissions` usa a checagem de admin global em vez da checagem de admin **por empresa**. Um usuário com marcação de admin global que pertença a uma empresa pode alterar permissões de menu daquela empresa mesmo sem ser admin dela.
Correção: trocar a checagem global pela checagem escopada por empresa na política.

### 2. Bypass do bloqueio de tentativas de login (alto)
A função `auth-guard` aceita a ação `success` sem qualquer prova de que o login realmente ocorreu. Qualquer pessoa pode chamar essa ação e zerar o contador de tentativas, anulando o limite de 5 tentativas por 15 minutos (força bruta).
Correção: só zerar o contador quando a chamada vier com um token de sessão válido do próprio e-mail informado (validação do JWT dentro da função).

### 3. Recuperação de senha troca a senha do usuário (alto)
A função `reset-password` gera uma senha temporária e **sobrescreve a senha atual** de quem for informado. Isso permite que um terceiro derrube o acesso de qualquer usuário só sabendo o e-mail (3x por hora).
Correção: enviar um link de redefinição (link de recuperação gerado pelo backend, que expira) em vez de trocar a senha; a senha só muda quando a pessoa abre o link e define a nova senha na tela `/reset-password`, que já existe.

### 4. Política de upload de imagens no papel `public` (médio)
A política de upload no bucket de imagens de produto está aplicada ao papel `public` em vez de `authenticated`. A checagem interna hoje já barra anônimos, mas o escopo correto evita depender só disso.
Correção: recriar a política restrita a `authenticated`.

### 5. CORS aberto (`*`) em todas as funções (médio)
Todas as funções aceitam qualquer origem. Para as funções autenticadas isso facilita abuso a partir de sites de terceiros.
Correção: restringir a origem às URLs oficiais (domínio publicado, domínio personalizado e preview), mantendo `*` apenas nas rotas realmente públicas (catálogo/provador).

### 6. Número de suporte global exposto a qualquer usuário logado (baixo)
`get-support-number` usa a chave de serviço e devolve o número da configuração global para qualquer usuário autenticado. Baixo impacto, mas vale limitar o retorno e manter o log limpo.

## Detalhes técnicos

- Migração de banco: recriar política de `user_menu_permissions` usando `has_company_role(auth.uid(), company_id, 'admin')`; recriar a política de upload em `storage.objects` com `TO authenticated`.
- `supabase/functions/auth-guard/index.ts`: validar o JWT no `Authorization` (com a chave publicável) antes de aceitar `action: "success"`, e conferir se o e-mail do token bate com o e-mail enviado.
- `supabase/functions/reset-password/index.ts`: substituir `updateUserById({ password })` por `auth.admin.generateLink({ type: 'recovery' })` e enviar o link no e-mail; manter o mesmo rate limit e a resposta genérica que não revela se o e-mail existe.
- Cabeçalhos CORS: criar helper compartilhado em `supabase/functions/_shared/cors.ts` com lista de origens permitidas e aplicar nas funções autenticadas.
- Ao final: rodar o linter do banco e o scanner de segurança para confirmar que os apontamentos foram fechados, e marcar os achados como resolvidos.

## Fora de escopo
Nenhuma mudança visual ou de fluxo de uso, exceto a tela de recuperação de senha, que passa a receber um link em vez de senha temporária.
