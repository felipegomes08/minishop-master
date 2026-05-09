## O que está acontecendo

Confirmei o seguinte rodando o site publicado e o preview:

- **A landing publicada já está na versão nova** (Ouro com "Melhor escolha", preços 97/167/249, Bronze sem cupons/financeiro). O código em `src/components/landing/PricingSection.tsx` está correto.
- **As telas novas existem no código e estão registradas no menu** (`/expenses`, `/financial`, `/users` em `AdminLayout.tsx`).
- **Não há mais `vite-plugin-pwa`** no `package.json` nem nada importando service worker no `src/`. Só sobrou referência em `pnpm-lock.yaml`/`package-lock.json` (inofensivo, não é instalado de fato).
- O servidor publicado responde:
  - `GET /sw.js` → **200** (kill-switch atual, OK)
  - `GET /service-worker.js` → **404** (não tem kill-switch nesse caminho)

Ou seja, o que você está vendo é **cache do navegador no seu dispositivo**, não código antigo no projeto. Existem duas causas combinadas, e vou cobrir as duas:

1. **Service worker fantasma do PWA antigo:** se em algum momento o app registrou SW em `/service-worker.js` (caminho comum do `vite-plugin-pwa`), seu navegador continua servindo o HTML cacheado antigo e o kill-switch atual em `/sw.js` nunca é executado. Sem um kill-switch em `/service-worker.js`, esse SW legado fica preso "para sempre" no seu device.
2. **Permissões de menu:** se o usuário logado é um funcionário restrito (`user_menu_permissions` com linhas), só aparecem os menus salvos na época da criação. Como Despesas/Financeiro/Usuários são novos, eles ficam escondidos até o dono marcá-los manualmente. Vamos exibir um aviso claro para o dono saber.

## O que vou fazer

### 1. Kill-switch service worker em todos os caminhos comuns
- Criar `public/service-worker.js` com o mesmo conteúdo de `public/sw.js` (skipWaiting → claim → limpar todos os caches → renavegar clientes com `?sw-cleanup=ts` → `unregister`).
- Manter `public/sw.js` como já está.
- Resultado: qualquer device que ainda tenha SW antigo registrado em `/service-worker.js` recebe a versão "auto-destrutiva" no próximo carregamento, limpa o cache e força um reload limpo.

### 2. Reforçar a limpeza no boot do app
- Em `src/main.tsx`, além do `getRegistrations().unregister()` atual, fazer também:
  - Se houver qualquer registration ativa, chamar `caches.keys()` + delete em todos.
  - Após unregister, se detectar que veio de SW (`navigator.serviceWorker.controller`), forçar um `location.reload()` único (com flag em `sessionStorage` para não fazer loop).
- Isso garante que mesmo quem entrar pela primeira vez depois desta atualização tenha o cache antigo apagado imediatamente.

### 3. Limpeza dos lockfiles
- Remover `vite-plugin-pwa` e cadeia `workbox-*` que ficaram em `pnpm-lock.yaml` e `package-lock.json` (apenas arquivos de lock; nenhuma alteração de runtime). Mantém o repo coerente com a remoção do PWA.

### 4. Aviso na tela de Usuários para menus novos
- Em `src/pages/Users.tsx`, ao listar funcionários restritos, se algum deles **não tiver** uma das chaves novas (`expenses`, `financial`, `users`), mostrar um banner: "Há novos menus disponíveis (Despesas, Financeiro, Usuários). Edite o usuário e marque os que ele deve acessar."
- Isso resolve o caso "fiz login com um funcionário antigo e não aparecem as telas novas".

### 5. Validação
- Após publicar (você precisa clicar **Publicar → Update** no editor para o frontend ir ao ar), recomendo fazer **hard reload** no seu navegador no domínio publicado: `Ctrl+Shift+R` (Windows) ou `Cmd+Shift+R` (Mac). Em iOS/Android, abrir em aba anônima uma vez para confirmar.

## Detalhes técnicos

```text
public/
  sw.js               (já existe - kill-switch)
  service-worker.js   (NOVO - mesmo conteúdo, cobre o caminho antigo)

src/main.tsx
  - Mantém unregister + caches.delete
  - Se controller != null no boot: sessionStorage flag + location.reload() único
```

Arquivos tocados:
- `public/service-worker.js` (novo)
- `src/main.tsx` (reforço de limpeza)
- `src/pages/Users.tsx` (aviso de menus novos)
- `pnpm-lock.yaml`, `package-lock.json` (limpeza de entradas órfãs do PWA)

## Fora do escopo
- Não vou mexer no conteúdo da landing (já está correto).
- Não vou mexer nas telas de Despesas/Financeiro/Usuários em si (já existem).
- Não vou reintroduzir nada de PWA.
