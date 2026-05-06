
# Tela Financeiro + Chat IA

## Resumo
Nova tela `/financial` com cards de Receita, Despesas e Lucro do mês atual, gráfico mensal e um chat IA que responde perguntas sobre os dados da própria loja (vendas, despesas, produtos, clientes). Acesso controlado por permissão de menu **e** por plano mínimo Prata.

## Acesso
- Menu "Financeiro" aparece no sidebar conforme permissão definida em `Users.tsx` (igual aos demais menus).
- Bloqueio adicional: empresa precisa ter `plan_tier` = `prata` ou `ouro`. Caso contrário, exibe estado de upgrade ("Disponível nos planos Prata e Ouro") com botão para abrir WhatsApp do super admin (mesmo padrão já usado em Settings).
- `ProtectedRoute` em `App.tsx` ganha entrada `/financial` no `PATH_TO_MENU_KEY`.
- `planLimits.ts` ganha `MENU_KEYS.financial` e a checkbox aparece automaticamente em `Users.tsx`.

## Tela `/financial` (layout Material Design 3, pt-BR, BRL)

```text
┌──────────────────────────────────────────────────────────┐
│ Financeiro · [Seletor: Mês atual ▾]                       │
├──────────────────────────────────────────────────────────┤
│ [Receita R$ ...] [Despesas R$ ...] [Lucro R$ ...] [Vendas N] │
├──────────────────────────────────────────────────────────┤
│ Gráfico de barras: Receita x Despesas (12 meses)          │
├──────────────────────────────────────────────────────────┤
│ Top 5 despesas por categoria  │  Últimas 5 vendas          │
├──────────────────────────────────────────────────────────┤
│ 💬 Assistente Financeiro (chat com IA)                    │
└──────────────────────────────────────────────────────────┘
```

- Cards usam dados agregados via Supabase: `sales` (somatório `total` no período, filtrado por `company_id`) e `expenses` (somatório `amount`).
- Lucro = Receita − Despesas (conforme escolhido).
- Gráfico com `recharts` (já presente no projeto).
- Seletor de período: mês atual (default), mês anterior, últimos 3/6/12 meses.

## Chat IA — restrito aos dados da loja

Componente de chat na própria página (não persistente — histórico só na sessão, sem nova tabela), seguindo padrão markdown + streaming.

### Edge function `financial-chat`
- `verify_jwt` padrão (valida token em código), recebe `messages[]` e `companyId`.
- Resolve `companyId` do usuário autenticado via `get_user_company_id` (ignora qualquer companyId vindo do cliente — evita vazamento entre lojas).
- Antes de chamar a IA, monta um **snapshot agregado** consultando com `SUPABASE_SERVICE_ROLE_KEY` filtrando SEMPRE por `company_id`:
  - Vendas por mês (últimos 12 meses): total e quantidade
  - Despesas por mês e por categoria
  - Contagem de produtos ativos, estoque total, produtos com estoque baixo (<5)
  - Quantidade de clientes
  - Top 5 produtos mais vendidos no período
- Envia esse snapshot como `system` message para o modelo, com instrução estrita:
  > "Você é um assistente financeiro. Responda APENAS com base no JSON de dados fornecido desta loja. Nunca invente números. Se a pergunta não puder ser respondida pelos dados, diga que não há informação. Responda em português brasileiro, valores em BRL."
- Modelo: **`google/gemini-2.5-flash`** (gratuito durante o período promocional do Lovable AI Gateway, rápido e suficiente).
- Streaming SSE token a token, renderizado com `react-markdown` (já usado no projeto se disponível, senão adicionar).

### Garantias de isolamento
- Cliente nunca passa dados nem `company_id` para a IA — tudo é resolvido no backend a partir do JWT.
- Snapshot só contém agregados da empresa do usuário.
- Prompt do sistema instrui o modelo a recusar perguntas fora do escopo da loja.

## Detalhes técnicos

**Arquivos novos**
- `src/pages/Financial.tsx` — página principal
- `src/components/financial/FinancialChat.tsx` — UI do chat com streaming
- `src/components/financial/FinancialSummaryCards.tsx`
- `src/components/financial/RevenueExpenseChart.tsx`
- `supabase/functions/financial-chat/index.ts`

**Arquivos editados**
- `src/App.tsx` — rota `/financial` protegida + `PATH_TO_MENU_KEY`
- `src/components/layout/AdminLayout.tsx` — item de menu "Financeiro" (ícone `Wallet`/`TrendingUp`)
- `src/lib/planLimits.ts` — adicionar `financial` em `MENU_KEYS`
- `supabase/config.toml` — registrar a função (sem alterar `project_id`)

**Sem migrações de banco** — a tela apenas lê dados existentes; o chat não persiste histórico.

**Dependências** — `react-markdown` se ainda não instalado.

## Validação
- Testar com usuário de empresa Bronze: ver tela de upgrade.
- Testar com Prata/Ouro: ver dashboard + chat funcional.
- Testar pergunta fora do escopo ("clima de SP?") → IA recusa.
- Testar isolamento: usuário de empresa A não vê dados da empresa B (RLS + filtro server-side na edge function).
