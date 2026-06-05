## Objetivo
Oferecer **30 dias de teste gratuito** antes da primeira cobrança em todos os planos (Bronze, Prata, Ouro), totalmente integrado ao Stripe — o cartão é coletado no checkout, mas só é cobrado após o término do trial.

## Como funciona no Stripe
O Stripe tem suporte nativo a trial via `subscription_data.trial_period_days`. Não precisa criar produto novo nem mudar os price IDs. Características:

- Cartão é solicitado e validado no checkout (configurável).
- Nenhum valor é cobrado nos primeiros 30 dias.
- A subscription nasce com status `trialing` e vira `active` automaticamente na primeira cobrança.
- Cliente pode cancelar a qualquer momento durante o trial sem ser cobrado.
- E-mails de "trial terminando em X dias" são enviados pelo Stripe automaticamente (se ativado no dashboard).

## Mudanças necessárias

### 1. `supabase/functions/create-checkout/index.ts`
Adicionar `trial_period_days: 30` dentro de `subscription_data`:
```ts
subscription_data: {
  trial_period_days: 30,
  metadata: { plan_tier, ...(email && { email }) },
}
```
Opcional (recomendado): `trial_settings: { end_behavior: { missing_payment_method: 'cancel' } }` para cancelar automaticamente caso o cartão falhe ao final do trial.

### 2. `supabase/functions/check-subscription/index.ts` e `provision-company-from-checkout/index.ts`
Hoje a busca usa `status: "active"`. Durante o trial o status é `"trialing"`, então a empresa não seria provisionada nem reconhecida como ativa. Trocar para aceitar ambos:
```ts
status: "all"  // e filtrar no código por ['active','trialing']
```
ou listar e filtrar `['trialing','active']`. O `current_period_end` durante o trial já vem como a data do fim do trial — perfeito para mostrar "Teste grátis até DD/MM".

### 3. UI — `src/components/landing/PricingSection.tsx` e `src/pages/PostCheckout.tsx`
- Adicionar selo/texto nos planos: **"30 dias grátis · cancele quando quiser"**.
- Na tela pós-checkout, mostrar: "Seu teste de 30 dias começou! Primeira cobrança em DD/MM/AAAA."

### 4. (Opcional) Indicador de trial no app
No header ou Settings, mostrar "Teste grátis — termina em X dias" enquanto `plan_status === 'trialing'`. Pode ficar para uma segunda etapa.

## Pontos a confirmar
1. **30 dias vale para todos os planos** (Bronze, Prata, Ouro) ou só para alguns?
2. **Exigir cartão no checkout** (padrão, recomendado — evita abusos e converte melhor) ou permitir trial **sem cartão** (maior conversão de cadastro, mas exige outro fluxo)?
3. Vale aplicar o trial **apenas para novos clientes**? O Stripe não impede que o mesmo e-mail crie várias contas trial — se isso for preocupação, dá pra adicionar verificação por e-mail/CPF.

Posso seguir com **30 dias em todos os planos, com cartão exigido, cancelamento automático se cartão falhar** como padrão, caso não haja objeção.
