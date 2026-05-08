# Cadastro de produtos: limites por plano e performance da listagem

## 1. Limite de imagens por plano

Adicionar a regra no helper `src/lib/planLimits.ts`:

```ts
export const PLAN_IMAGE_LIMITS: Record<string, number> = {
  bronze: 3,
  prata: 6,
  ouro: 10,
};
export function getImageLimitForPlan(tier?: string | null): number {
  return PLAN_IMAGE_LIMITS[tier ?? ''] ?? 3;
}
```

Em `src/pages/Products.tsx`:
- Ler `planTier` via `useSubscription()` e calcular `imageLimit`.
- Em `handleImageUpload`:
  - Calcular `remaining = imageLimit - formData.images.length`.
  - Se `remaining <= 0`: toast de erro ("Limite de X imagens atingido para o plano <tier>. Faça upgrade para adicionar mais.") e retornar.
  - Se `files.length > remaining`: cortar para `remaining` e avisar via toast.
  - Validar `file.type.startsWith('image/')` antes do upload (descartar qualquer arquivo não-imagem, incluindo vídeos) — defesa adicional caso o usuário burle o `accept`.
- No bloco visual das imagens (linhas 522–557):
  - Mostrar contador `formData.images.length / imageLimit`.
  - Esconder o botão `+` quando o limite for atingido.
  - Adicionar texto pequeno: "Plano <tier>: até N imagens. Vídeos não são suportados."
- Garantir que `accept="image/*"` permanece e `multiple` continua, mas o input fica `disabled` quando atingido.

## 2. Bloquear vídeos

- Reforçar `accept="image/jpeg,image/png,image/webp,image/gif"` (mais específico que `image/*`, evita seletor mostrar vídeos em alguns browsers).
- Filtro client-side em `handleImageUpload` (item acima).
- Não há fluxo de upload de vídeo no projeto hoje — apenas garantir que continue assim.

## 3. Performance da listagem

Estratégia escolhida: **thumbnails via Supabase Storage image transform** (mais simples que virtualização e suficiente para o volume típico).

Criar helper `src/lib/imageThumb.ts`:

```ts
// Converte uma URL pública do bucket product-images em URL transformada (thumbnail).
// Ex.: width=120, quality=70.
export function getThumbUrl(url: string, size = 120): string {
  if (!url || !url.includes('/storage/v1/object/public/')) return url;
  return url.replace('/object/public/', '/render/image/public/') + 
    `?width=${size}&height=${size}&resize=cover&quality=70`;
}
```

Aplicar em `src/pages/Products.tsx`:
- Card mobile (linha 733): `<img src={getThumbUrl(product.images[0], 120)} loading="lazy" />`
- Tabela desktop (linha 825): `<img src={getThumbUrl(product.images[0], 96)} loading="lazy" />`
- Manter imagem original somente no diálogo de edição (linha 527, miniatura 80x80) usando `getThumbUrl(img, 160)`.

Benefícios: payload muito menor por produto na listagem, sem mexer em arquitetura. Se no futuro a lista crescer (>500 itens), aí avaliamos virtualização (`@tanstack/react-virtual`).

## Arquivos afetados

- `src/lib/planLimits.ts` — adicionar `PLAN_IMAGE_LIMITS` e helper.
- `src/lib/imageThumb.ts` — novo helper.
- `src/pages/Products.tsx` — limite, validação, UI de contador, thumbnails.

## Não escopo

- Sem mudanças no backend/RLS (limite é por UX; banco não precisa validar pois imagens vivem no array `images` do produto).
- Sem virtualização agora.
- Sem alterações em outras telas (catálogo público já usa `loading="lazy"`).
