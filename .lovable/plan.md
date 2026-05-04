## Tela de Usuários da Empresa

Criar uma página `/users` no painel admin onde o dono da empresa cria/gerencia funcionários, escolhe quais menus eles veem e respeita o limite do plano contratado.

### Limites por plano (já definidos na landing)
- Bronze: 1 usuário
- Prata: 3 usuários
- Ouro: 10 usuários

(O próprio admin conta no limite.)

### Mudanças no banco

1. **Nova tabela `user_menu_permissions`** — guarda quais menus cada usuário (não-admin) pode ver:
   - `id`, `user_id` (uuid), `company_id` (uuid), `menu_key` (text), `created_at`
   - Unique em (`user_id`, `menu_key`)
   - RLS:
     - Admin da empresa pode gerenciar (CRUD) das permissões dos usuários da sua empresa
     - O próprio usuário pode ler suas permissões (`user_id = auth.uid()`)
     - Super admin: tudo

2. **Edge function `create-company-user`** (verify_jwt = true) — usa `SUPABASE_SERVICE_ROLE_KEY` para:
   - Validar que quem chama é admin da empresa (via `has_role` + `get_user_company_id`)
   - Validar limite do plano (conta `company_users` da empresa contra o limite do `plan_tier`)
   - Criar usuário em `auth.users` (`admin.createUser`, email_confirm: true)
   - Inserir em `company_users` (role `user`)
   - Inserir em `user_roles` (role `admin` — para passar pelo `useAdminCheck` atual; permissão real vem dos menus)
   - Inserir as `user_menu_permissions` selecionadas
   - Retornar o `user_id` criado

3. **Edge function `delete-company-user`** — admin remove funcionário: deleta `auth.users`, cascateando vínculos.

### Mudanças no frontend

1. **`src/pages/Users.tsx`** (nova): lista funcionários da empresa, botão "Adicionar usuário" (desabilitado quando atinge o limite do plano, com tooltip explicando), dialog com:
   - Nome, email, senha
   - Checkboxes dos menus disponíveis (Painel, Produtos, Categorias, Atributos, Clientes, Vendas, Despesas, Cupons, Configurações)
   - Painel sempre marcado por padrão
   - Botão "Excluir" por linha
   - Card no topo mostrando "X de Y usuários usados" conforme o plano

2. **`src/hooks/useUserPermissions.ts`** (novo): retorna `{ allowedMenus: Set<string>, isOwnerAdmin: boolean, loading }`. Se o usuário **só** tem entrada em `company_users` com role `admin` e foi criado pela company (não é o dono), filtra pelos menus permitidos. Para simplificar: se existir qualquer linha em `user_menu_permissions` para o usuário, ele é "funcionário restrito"; senão, é admin pleno (vê tudo).

3. **`src/components/layout/AdminLayout.tsx`**: usar `useUserPermissions` para filtrar `navItems` antes de renderizar (desktop e mobile). Sempre incluir Painel.

4. **`src/App.tsx`**: incluir rota `/users` (visível apenas ao dono — funcionários restritos não veem essa entrada no menu). Para bloquear acesso direto via URL a páginas sem permissão, adicionar guard simples no `ProtectedRoute` que checa o pathname contra `allowedMenus`; se não permitido, redireciona para `/`.

5. **`src/components/landing/PricingSection.tsx`**: nenhuma mudança (já tem os limites). Centralizar os limites em `src/lib/planLimits.ts` para uso compartilhado entre frontend e edge function.

### Observações
- Funcionários são tecnicamente `admin` no `user_roles` para reaproveitar o `useAdminCheck` e RLS existentes. A restrição é puramente de UI (o usuário pediu isso explicitamente: "se o usuário não tiver permissão da tela de despesas ele apenas não verá ela no menu, somente isso").
- O dono original (criado via provisionamento Stripe) não tem entradas em `user_menu_permissions` → vê tudo, incluindo `/users`.
- Funcionários criados sempre terão pelo menos 1 entrada em `user_menu_permissions` → não veem `/users` (a menos que seja marcada).

### Texto do plano em pt-BR
Toda a UI será em português brasileiro conforme as regras do projeto.
