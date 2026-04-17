

# Integração Stripe (BYOK) + Sistema de Assinaturas Lojix

## Resumo
Integrar Stripe usando sua conta própria para vender os 3 planos (Bronze R$97, Prata R$167, Ouro R$249) como assinaturas mensais recorrentes, com gating automático de funcionalidades por plano.

## Arquitetura

```text
Landing /landing → Botão "Começar agora"
   ↓
Usuário cria conta (signup) ou faz login
   ↓
Edge Function `create-checkout` → cria Stripe Checkout Session
   ↓
Stripe Checkout (hospedado pelo Stripe, BRL, cartão + Pix)
   ↓
Webhook `stripe-webhook` recebe eventos
   ↓
Tabela `subscriptions` atualizada (company_id, plan_tier, status)
   ↓
Hook `useSubscription` lê plano ativo → libera/bloqueia features
```

## Etapas (vou te guiar uma por vez)

### Etapa 1 — Habilitar integração Stripe BYOK
- Lovable abre um painel pedindo sua **Stripe Secret Key** (`sk_test_...` para começar em modo teste)
- Você cola a chave, fica armazenada como secret seguro

### Etapa 2 — Criar produtos e preços no seu dashboard Stripe
Você criará manualmente no Stripe (te passo o passo a passo exato):
- 3 produtos: Lojix Bronze, Lojix Prata, Lojix Ouro
- 3 preços recorrentes mensais em BRL (R$ 97, R$ 167, R$ 249)
- Copia os 3 `price_id` (formato `price_xxx`) e me envia

### Etapa 3 — Criar tabela `subscriptions` no banco
```text
subscriptions
- id, company_id (FK), user_id
- stripe_customer_id, stripe_subscription_id
- plan_tier (bronze | prata | ouro)
- status (active | past_due | canceled | trialing)
- current_period_end
- RLS: usuário só vê assinatura da própria company
```

### Etapa 4 — Edge Function `create-checkout`
- Recebe `plan_tier` do frontend
- Cria/recupera Stripe Customer vinculado ao user
- Cria Checkout Session com o `price_id` correto
- Retorna URL do checkout → frontend redireciona

### Etapa 5 — Edge Function `stripe-webhook`
- Recebe eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- Sincroniza tabela `subscriptions`
- Configurada com `verify_jwt = false` (Stripe não envia JWT)
- Você cadastra a URL do webhook no dashboard Stripe e cola o `webhook_secret`

### Etapa 6 — Conectar landing aos botões de checkout
- Botões "Começar agora" da `PricingSection.tsx` chamam `create-checkout`
- Se não logado → redireciona para `/auth?redirect=checkout&plan=prata`
- Após pagamento → redireciona para `/?welcome=true`

### Etapa 7 — Hook `useSubscription` + gating de features
- Hook lê `subscriptions` da company atual
- Define limites por plano:

```text
Bronze: 1 user, 50 produtos, 3 imgs/produto, sem CRM/cupons/IA
Prata:  3 users, 100 produtos, 6 imgs, +CRM +cupons +importador IA +insights IA
Ouro:   10 users, ilimitado, 10 imgs, +virtual try-on
```

- Bloqueios aplicados em: criação de produtos (limite), upload de imagens, acesso a `/coupons`, `/customers`, importador, insights, virtual try-on
- Telas bloqueadas mostram upgrade prompt: "Disponível no plano Prata — Fazer upgrade"

### Etapa 8 (depois) — Página `/billing` em Settings
- Mostra plano atual, próxima cobrança, status
- Botão "Gerenciar assinatura" abre Stripe Customer Portal (Stripe oferece pronto, só ativar)

## Modo teste vs produção
Começamos tudo em **modo teste** com `sk_test_...` — você testa pagamentos com o cartão `4242 4242 4242 4242` sem cobrar dinheiro real. Quando estiver tudo funcionando, troca para `sk_live_...` e price IDs de produção.

## O que vou precisar de você ao longo do caminho
1. Sua Stripe Secret Key de teste (etapa 1)
2. Os 3 `price_id` após criar os produtos no Stripe (etapa 2)
3. O `webhook_secret` após cadastrar a URL do webhook (etapa 5)

Me confirma que pode seguir e eu já começo pela **Etapa 1** (habilitar a integração Stripe BYOK).

