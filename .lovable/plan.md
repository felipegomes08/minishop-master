## Problema

Esse comportamento é da PWA (vite-plugin-pwa) configurada no projeto. Hoje, quando uma nova versão sobe:

1. O Service Worker baixa os arquivos novos em background.
2. Mas ele só "assume" o controle depois que **todas as abas** do site são fechadas e reabertas — por isso você só vê a nova tela após limpar o cache ou abrir em aba anônima.
3. Além disso, o `index.html` está sendo precacheado pelo workbox, o que reforça o efeito de "tela velha".

Não é o padrão ideal — dá pra ajustar para que toda atualização seja aplicada automaticamente no próximo refresh.

## Mudanças propostas (apenas em `vite.config.ts`)

Ajustar o bloco `VitePWA(...)`:

- **`workbox.skipWaiting: true`** — o novo SW assume controle imediatamente, sem esperar fechar abas.
- **`workbox.clientsClaim: true`** — o novo SW passa a controlar abas já abertas.
- **`workbox.cleanupOutdatedCaches: true`** — remove caches antigos do workbox.
- **`workbox.navigateFallbackDenylist`** + **NetworkFirst para navegações HTML** — garante que `index.html` venha sempre da rede quando online (com fallback offline), evitando carregar o shell antigo.
- Manter `registerType: "autoUpdate"` (já está correto).

E em `src/main.tsx`:

- Adicionar um pequeno listener via `virtual:pwa-register` que faz `window.location.reload()` automaticamente quando o SW novo entra em `activated`. Isso garante que, mesmo se o usuário estiver com a aba aberta no momento do deploy, ele recebe a versão nova no próximo carregamento sem ação manual.

## Resultado esperado

- Após cada publicação, basta o usuário dar refresh normal (F5) — sem precisar limpar cache nem abrir aba anônima.
- Abas que já estavam abertas vão recarregar sozinhas assim que o novo SW for ativado (≈ alguns segundos após o deploy).
- O modo offline da PWA continua funcionando.

## Observação

A primeira vez após aplicar essa mudança ainda exigirá um reload (porque o SW antigo precisa ser substituído pelo novo já com `skipWaiting`). A partir daí, todas as próximas atualizações serão automáticas.
