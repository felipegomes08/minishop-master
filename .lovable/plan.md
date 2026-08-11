# Pixel do Facebook (Meta) — landing e pós-checkout

Pixel ID: `1589201359225793`. É um identificador público (visível no HTML de qualquer site que use o pixel), então vai direto no código — variável de ambiente não traria segurança adicional.

## Escopo

Rastreamento apenas em:
- `/landing` (página de vendas)
- `/post-checkout` (confirmação de compra do acesso)

Nenhum disparo no catálogo público nem na área administrativa das lojas.

## Eventos

| Evento | Quando dispara |
| --- | --- |
| `PageView` | Ao abrir a landing e ao abrir a página pós-checkout |
| `InitiateCheckout` | Ao clicar em um plano na seção de preços (antes do redirecionamento ao Stripe), com o nome do plano |
| `Purchase` | Ao chegar na página pós-checkout com sessão de pagamento válida, com o plano da URL |

## Detalhes técnicos

- Novo `src/lib/fbPixel.ts`: carrega o script `fbevents.js` sob demanda (uma única vez), inicializa o pixel e expõe helpers `initPixel()` e `trackEvent(name, params)` com tipagem para `window.fbq`.
- O snippet **não** vai no `<head>` do `index.html`, para não carregar o pixel na área logada nem no catálogo dos clientes. O `<noscript>` com a imagem de fallback será inserido no `<body>` do `index.html` (regra HTML5: `<noscript>` no `<head>` só aceita metadados).
- `src/pages/Landing.tsx`: `useEffect` que inicializa o pixel e dispara `PageView`.
- `src/components/landing/PricingSection.tsx`: dispara `InitiateCheckout` dentro de `handleSubscribe`, antes do `fetch` do `create-checkout`.
- `src/pages/PostCheckout.tsx`: `useEffect` que inicializa o pixel, dispara `PageView` e, havendo `session_id`, dispara `Purchase` uma única vez com o plano.
- Valores monetários no `Purchase` não serão enviados por padrão (a página só conhece o tier, não o preço confirmado). Se quiser valor e moeda, dá para mapear os preços dos planos — me avise.
