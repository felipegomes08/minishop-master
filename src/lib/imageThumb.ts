// Converte uma URL pública do Supabase Storage em URL transformada (thumbnail).
// Reduz drasticamente o payload em listagens.
export function getThumbUrl(url: string | null | undefined, size = 120): string {
  if (!url) return '';
  if (!url.includes('/storage/v1/object/public/')) return url;
  return (
    url.replace('/object/public/', '/render/image/public/') +
    `?width=${size}&height=${size}&resize=cover&quality=70`
  );
}
