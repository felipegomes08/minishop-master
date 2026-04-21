

# Vincular Empresas aos Planos Contratados

## Como funciona hoje

Hoje o fluxo de pagamento e o cadastro de empresa são **desconectados**:

```text
Stripe Checkout (paga)          Master Admin (cria empresa)
        ↓                                ↓
  subscriptions                      companies
  (company_id, plan_tier)            (sem plano)
        ↓                                ↓
   ❌ não conversam entre si
```

Problemas:
1. A tabela `companies` não tem coluna `plan_tier` — você não vê na listagem de empresas qual plano cada uma tem
2. Quando alguém paga no Stripe sem ter empresa ainda, o `subscriptions.company_id` fica órfão
3. Quando você cria empresa no Master Admin, não há como dizer "essa empresa é do plano Ouro"
4. Sem gating: o sistema não bloqueia features baseado no plano

## Estratégia proposta

Tornar o **plano** uma propriedade visível da empresa, com duas fontes:
- **Automática**: quando o Stripe confirma pagamento, sincroniza no `companies.plan_tier`
- **Manual**: você (Super Admin) pode definir/sobrescrever o plano de qualquer empresa pelo Master Admin (útil para cortesias, testes, planos legados)

## Mudanças

### 1. Banco de dados
Adicionar à tabela `companies`:
- `plan_tier` (text: `bronze` | `prata` | `ouro` | `null`) — plano ativo
- `plan_status` (text: `active` | `past_due` | `canceled` | `trialing` | `manual` | `null`) — `manual` = você atribuiu sem Stripe
- `plan_source` (text: `stripe` | `manual` | `null`) — origem do plano
- `subscription_end` (timestamptz) — fim do período pago

Criar função `sync_company_plan_from_subscription()` que, quando uma linha em `subscriptions` muda, atualiza os campos correspondentes em `companies` (apenas se `plan_source != 'manual'`, para não sobrescrever atribuições manuais).

Trigger em `subscriptions` (AFTER INSERT OR UPDATE) que chama essa função.

### 2. Master Admin — `MasterCompanies.tsx`
Na listagem de empresas, adicionar:
- **Coluna "Plano"** com badge colorido: Bronze (cinza), Prata (azul), Ouro (âmbar), Sem plano (vermelho)
- **Coluna "Status"**: Ativo / Vencido / Cancelado / Manual
- **Filtro** por plano no topo

No formulário de criar/editar empresa:
- Campo `Select` "Plano contratado" com opções: Sem plano / Bronze / Prata / Ouro
- Campo `Select` "Origem": Stripe (somente leitura, vem do webhook) / Manual (você define)
- Campo `Date` "Vence em" (opcional, apenas para planos manuais)
- Aviso visual quando o plano vem do Stripe: "Este plano é gerenciado pelo Stripe — alterações manuais aqui sobrescrevem a sincronização"

### 3. Vincular pagamento Stripe → empresa
Como o checkout hoje aceita compradores sem login, precisamos resolver "quem é a empresa dessa assinatura?". Fluxo proposto:

```text
1. Usuário compra no Stripe (qualquer e-mail)
2. Stripe redireciona para /pos-pagamento?session_id=cs_xxx&plan=prata
3. Página /pos-pagamento mostra:
   - "Pagamento confirmado!"
   - Formulário: nome da empresa + e-mail + senha
   - Cria conta + empresa + vincula subscription via edge function
4. Edge function `provision-company-from-checkout`:
   - Verifica session_id no Stripe (confirma pagamento)
   - Cria user no Supabase Auth
   - Cria company (com plan_tier preenchido)
   - Cria company_users (user → company, role admin)
   - Cria user_roles (admin)
   - Cria subscription (company_id + stripe_customer_id + plan_tier)
5. Redireciona para /auth para login
```

### 4. Hook `useSubscription` (preparação para gating)
Criar `src/hooks/useSubscription.ts` que lê `companies.plan_tier` da empresa do usuário logado. Ainda **sem aplicar bloqueios** — apenas expõe o plano para uso futuro:

```typescript
const { planTier, isActive, hasFeature } = useSubscription();
// hasFeature('virtual_try_on') → só true se planTier === 'ouro'
// hasFeature('crm') → true se planTier === 'prata' | 'ouro'
```

## Arquivos afetados

**Migração SQL** (nova):
- Adiciona colunas em `companies`
- Cria função e trigger de sincronização

**Edge function nova**:
- `supabase/functions/provision-company-from-checkout/index.ts`

**Páginas/componentes**:
- `src/pages/master/MasterCompanies.tsx` — coluna plano, filtro, campos no formulário
- `src/pages/PostCheckout.tsx` (nova) — formulário pós-pagamento
- `src/App.tsx` — rota `/pos-pagamento`
- `supabase/functions/create-checkout/index.ts` — atualizar `success_url` para `/pos-pagamento?session_id={CHECKOUT_SESSION_ID}&plan=...`
- `src/hooks/useSubscription.ts` (novo)

## O que **não** será feito agora (próximos passos)
- Aplicar gating nas features (Virtual Try-On, CRM, cupons, IA) — fica para um próximo passo
- Tela "Minha Assinatura" em Settings — próximo passo
- Webhook do Stripe — você optou por não usar agora; a sincronização acontece via `check-subscription` (chamada no login) e via `provision-company-from-checkout` (no pós-pagamento)

## Decisão necessária antes de implementar

Para a **Etapa 3 (vinculação Stripe → empresa)**, qual fluxo prefere?

**Opção A (recomendada)**: Página `/pos-pagamento` que coleta dados da empresa após o pagamento confirmado pelo Stripe. Mais simples, sem login prévio, conversão maior na landing.

**Opção B**: Exigir cadastro **antes** do checkout. Usuário cria conta + empresa primeiro, depois paga. Mais controle, mas adiciona fricção e contradiz a estratégia atual ("botões da landing vão direto pro Stripe").

**Opção C**: Apenas a parte manual agora (Master Admin atribui plano). A vinculação automática Stripe → empresa fica para depois, e por enquanto você cria as empresas manualmente após receber notificação de pagamento por e-mail do Stripe.

