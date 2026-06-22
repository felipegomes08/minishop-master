## Diagnóstico

A URL que dá 404 é `https://minishop-master.vercel.app/catalogo/shine-pratas` — ou seja, o app foi publicado na **Vercel**, não no Lovable.

O código em si está correto: o botão "Ver catálogo" em `src/pages/Settings.tsx:332` (e o equivalente em `src/pages/master/MasterCompanies.tsx:452`) usa caminho relativo `/catalogo/${slug}`, que funciona em qualquer domínio. Não há URL fixa do Lovable em nenhuma rota interna do app.

**A causa do 404 é hospedagem, não código.** A Vercel, por padrão, em projetos Vite, tenta servir um arquivo físico em `/catalogo/shine-pratas` — esse arquivo não existe (é uma rota client-side do React Router), então retorna 404. O Lovable resolve isso automaticamente; a Vercel precisa de configuração explícita (SPA fallback).

Esse mesmo problema vai acontecer em **toda** rota acessada diretamente ou recarregada (F5) na Vercel: `/products`, `/sales`, `/catalogo/:slug/produto/:id`, `/reset-password`, `/pos-pagamento`, `/master/*`, etc. Você só não notou ainda porque navegou pelo menu interno.

## Correção

Criar `vercel.json` na raiz do projeto com uma regra de rewrite que mande qualquer rota não-arquivo para `index.html`, deixando o React Router resolver:

```json
{
  "rewrites": [
    { "source": "/((?!assets/|.*\\..*).*)", "destination": "/index.html" }
  ]
}
```

A regex exclui:
- `assets/...` (arquivos buildados pelo Vite)
- qualquer caminho com extensão (`.js`, `.css`, `.png`, `.svg`, `robots.txt`, `sw.js`, etc.)

Assim assets continuam sendo servidos diretamente, e qualquer rota tipo `/catalogo/shine-pratas` cai no `index.html` e o React Router assume.

## Passos

1. Criar `vercel.json` na raiz com o conteúdo acima.
2. Fazer commit/push para o repositório conectado à Vercel — ela redeploya automaticamente.
3. Testar: abrir `https://minishop-master.vercel.app/catalogo/shine-pratas` direto na barra do navegador e recarregar `/products` logado.

## Observação adicional

Como você tem **domínio personalizado próprio** e quer hospedar fora do Lovable, a Vercel é uma escolha válida — só precisa desse `vercel.json`. Alternativamente, dá para apontar o domínio para o Lovable (DNS A → 185.158.133.1) e usar o publish nativo, que já tem SPA fallback embutido e não exige configuração extra. As duas abordagens funcionam; é só uma decisão de onde você quer manter o deploy.
