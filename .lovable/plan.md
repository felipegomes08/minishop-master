# Criar usuário do zero pelo Super Admin

Hoje a tela de Usuários (Super Admin) só permite **vincular** um usuário já existente informando o User ID. Falta a opção de **criar** o primeiro usuário de uma empresa recém-criada.

## O que será feito

1. Novo botão **"Criar usuário"** no bloco "Usuários de Empresas" (ao lado de "Vincular").
2. Diálogo simples com: Nome, E-mail, Senha (mín. 8 caracteres), Empresa (lista das empresas cadastradas) e Perfil (admin/usuário).
3. Ao salvar, o usuário é criado já com e-mail confirmado e vinculado à empresa escolhida, aparecendo imediatamente na tabela com nome e e-mail.
4. Mensagens de erro claras (e-mail já existente, senha curta, empresa não selecionada).
5. O botão "Vincular" continua existindo, para casos em que o usuário já existe.

Observação: o usuário criado por aqui é o **proprietário/admin** da empresa (sem restrições de menu), então ele poderá criar os funcionários dele na tela de Usuários da própria empresa. Também não aplicamos o limite de usuários do plano nessa criação inicial, já que é o primeiro acesso da empresa.

## Detalhes técnicos

- Nova edge function `create-user-superadmin`:
  - Valida JWT do chamador e exige `is_super_admin(auth.uid())`.
  - Rate limit reaproveitando `_shared/rate-limit.ts` (ex.: 20/hora por chamador).
  - Valida corpo (nome, e-mail, senha ≥ 8, `company_id` existente, role).
  - Cria o usuário via `auth.admin.createUser` com `email_confirm: true` e `user_metadata.name`.
  - Insere em `company_users` (company_id + role) e em `user_roles` com role `admin`; em caso de falha, remove o usuário criado (rollback).
  - CORS padrão do projeto.
- `src/pages/master/MasterUsers.tsx`: novo estado/diálogo de criação, chamada via `supabase.functions.invoke`, e `fetchData()` após sucesso.
- Sem alteração de schema no banco.
