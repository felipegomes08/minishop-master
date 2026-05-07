## Remover PWA completamente

O sistema será apenas web responsivo. Vou remover toda a infraestrutura de PWA (vite-plugin-pwa, service worker, manifest, registro no client) e adicionar um **kill-switch service worker** para desinstalar o SW que já está registrado nos navegadores dos usuários atuais — sem isso, quem já abriu o app continuaria preso ao cache antigo para sempre.

### Mudanças

**1. Remover registro do PWA**
- `src/main.tsx`: remover `registerSW` e o import de `virtual:pwa-register`. Adicionar bloco que detecta service workers já registrados e os desinstala + limpa caches (executa só uma vez por sessão).
- `src/vite-env.d.ts`: remover a linha `/// <reference types="vite-plugin-pwa/client" />`.

**2. Remover plugin do build**
- `vite.config.ts`: remover import e bloco `VitePWA(...)` inteiro.
- `package.json`: remover dependência `vite-plugin-pwa`.

**3. Limpar HTML**
- `index.html`: remover meta tags PWA (`theme-color`, `apple-mobile-web-app-*`, `apple-touch-icon`, `mask-icon`). Manter apenas o `favicon.svg` e meta tags padrão (viewport, OG, Twitter).

**4. Kill-switch service worker (essencial)**
- Criar `public/sw.js` estático que, ao ativar, limpa todos os caches, navega os clientes abertos para forçar reload, e faz `unregister()` de si mesmo. Isso garante que dispositivos que já tinham o SW antigo registrado se livrem dele na próxima visita.
- Manter este arquivo no projeto por pelo menos 1–2 ciclos de release antes de removê-lo.

**5. Remover assets PWA**
- Apagar `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/apple-touch-icon.png`, `public/mask-icon.svg`.

### Resultado esperado

- Builds futuros não geram mais `manifest.webmanifest` nem service worker.
- O proxy do Lovable já serve HTML com `Cache-Control: no-cache`, então mudanças aparecerão imediatamente após o deploy (basta refresh normal).
- Usuários que já tinham o SW antigo: ao abrir uma vez, o kill-switch limpa tudo e recarrega automaticamente. Da próxima visita em diante, tudo funciona como web app comum.
- App continua 100% responsivo (Tailwind + layouts atuais).

### Observação sobre instalações existentes

Se algum usuário tinha "Adicionar à tela inicial" instalado, o ícone continuará na tela do celular mas vai abrir como uma aba normal do navegador. Eles precisam remover manualmente se quiserem.
