import type { ItemPhoto } from '@/models/CollectionItem';

/** Shared request-body validation for photo arrays (POST + PATCH). */
export function parsePhotos(value: unknown): ItemPhoto[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (p): p is { url: string; width?: number; height?: number } =>
        Boolean(p) &&
        typeof (p as { url?: unknown }).url === 'string' &&
        (p as { url: string }).url.length > 0,
    )
    .slice(0, 10)
    .map((p) => ({
      url: p.url,
      width: typeof p.width === 'number' ? p.width : 0,
      height: typeof p.height === 'number' ? p.height : 0,
      uploadedAt: new Date(),
    }));
}
