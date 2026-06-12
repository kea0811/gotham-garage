'use client';

import { isDemoMode } from './mode';
import {
  listDemoItems,
  getDemoItem,
  putDemoItem,
  deleteDemoItem,
} from './store';
import { cosineSimilarity, DUPLICATE_THRESHOLD } from '@/lib/similarity';
import type { CollectionItemDTO, ItemSource, ItemStatus } from '@/models/CollectionItem';

let installed = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function nowIso() {
  return new Date().toISOString();
}

async function readBody(init: RequestInit | undefined, input: RequestInfo | URL): Promise<Record<string, unknown>> {
  let raw: string | undefined;
  if (init?.body && typeof init.body === 'string') raw = init.body;
  else if (input instanceof Request) raw = await input.clone().text();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Patches window.fetch so that, in demo mode, the collection API routes are
 * served from the local IndexedDB store. /api/upc is forwarded to the real
 * (public) endpoint so barcode lookups still work; everything non-API passes
 * through untouched.
 */
export function installDemoInterceptor(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const orig = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!isDemoMode()) return orig(input, init);

    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = (
      init?.method ?? (input instanceof Request ? input.method : 'GET')
    ).toUpperCase();

    let path: string;
    let search: URLSearchParams;
    try {
      const u = new URL(url, window.location.origin);
      path = u.pathname;
      search = u.searchParams;
    } catch {
      return orig(input, init);
    }

    if (!path.startsWith('/api/')) return orig(input, init);
    if (path.startsWith('/api/upc/')) return orig(input, init); // real public lookup
    if (path.startsWith('/api/auth/')) return orig(input, init);

    try {
      // GET /api/collection (list + filter + paginate)
      if (path === '/api/collection' && method === 'GET') {
        const all = await listDemoItems();
        const q = search.get('q')?.trim().toLowerCase();
        const year = search.get('year');
        const series = search.get('series');
        const status = search.get('status');
        const filtered = all.filter((i) => {
          if (year && /^\d{4}$/.test(year) && i.year !== Number.parseInt(year, 10)) return false;
          if (series && i.series !== series) return false;
          if (status && i.status !== status) return false;
          if (!q) return true;
          return [i.name, i.series, i.castingName, i.notes, String(i.year ?? '')]
            .filter(Boolean)
            .some((f) => f!.toLowerCase().includes(q));
        });
        const limit = Math.min(200, Math.max(1, Number.parseInt(search.get('limit') ?? '50', 10) || 50));
        const page = Math.max(1, Number.parseInt(search.get('page') ?? '1', 10) || 1);
        const items = filtered.slice((page - 1) * limit, page * limit);
        return json({ items, page, limit, total: filtered.length, hasMore: page * limit < filtered.length });
      }

      // POST /api/collection (create)
      if (path === '/api/collection' && method === 'POST') {
        const b = await readBody(init, input);
        const name = typeof b.name === 'string' ? b.name.trim() : '';
        if (!name) return json({ error: 'A car name is required.' }, 400);
        const ts = nowIso();
        const item: CollectionItemDTO = {
          id: (crypto.randomUUID?.() ?? `demo-${Date.now()}-${Math.round(performance.now())}`),
          name,
          year: typeof b.year === 'number' ? b.year : undefined,
          series: typeof b.series === 'string' ? b.series : undefined,
          castingName: typeof b.castingName === 'string' ? b.castingName : undefined,
          color: typeof b.color === 'string' ? b.color : undefined,
          baseCode: typeof b.baseCode === 'string' ? b.baseCode : undefined,
          upc: typeof b.upc === 'string' ? b.upc : undefined,
          photos: Array.isArray(b.photos)
            ? (b.photos as { url: string; width?: number; height?: number }[]).map((p) => ({
                url: p.url,
                width: p.width ?? 0,
                height: p.height ?? 0,
                uploadedAt: ts,
              }))
            : [],
          notes: typeof b.notes === 'string' ? b.notes : undefined,
          status: (['owned', 'wanted', 'sold', 'duplicate'].includes(b.status as string)
            ? b.status
            : 'owned') as ItemStatus,
          source: (['upc', 'visual', 'manual'].includes(b.source as string) ? b.source : 'manual') as ItemSource,
          createdAt: ts,
          updatedAt: ts,
          // embedding lives on the stored object (not in the DTO type) for matching.
          ...(Array.isArray(b.embedding) ? { embedding: b.embedding } : {}),
        } as CollectionItemDTO;
        await putDemoItem(item);
        return json({ item });
      }

      // GET /api/collection/embeddings
      if (path === '/api/collection/embeddings' && method === 'GET') {
        const all = (await listDemoItems()) as (CollectionItemDTO & { embedding?: number[] })[];
        return json({
          embeddings: all
            .filter((i) => Array.isArray(i.embedding) && i.embedding.length > 0)
            .map((i) => ({ id: i.id, embedding: i.embedding })),
        });
      }

      // POST /api/duplicate-check  { embedding?, upc? }
      if (path === '/api/duplicate-check' && method === 'POST') {
        const b = await readBody(init, input);
        const all = (await listDemoItems()) as (CollectionItemDTO & { embedding?: number[] })[];
        if (typeof b.upc === 'string' && b.upc) {
          const dup = all.filter((i) => i.upc === b.upc);
          if (dup.length) {
            return json({
              duplicates: dup.map((item) => ({ item, score: 1, reason: 'upc' })),
              threshold: DUPLICATE_THRESHOLD,
            });
          }
        }
        if (Array.isArray(b.embedding) && b.embedding.length) {
          const query = b.embedding as number[];
          const hits = all
            .filter((i) => Array.isArray(i.embedding) && i.embedding!.length === query.length)
            .map((i) => ({ item: i, score: cosineSimilarity(query, i.embedding!) }))
            .filter((h) => h.score >= DUPLICATE_THRESHOLD)
            .sort((a, b2) => b2.score - a.score);
          if (hits.length) {
            return json({
              duplicates: hits.map((h) => ({ item: h.item, score: h.score, reason: 'visual' })),
              threshold: DUPLICATE_THRESHOLD,
            });
          }
        }
        return json({ duplicates: [], threshold: DUPLICATE_THRESHOLD });
      }

      // /api/collection/[id]  GET | PATCH | DELETE
      const m = path.match(/^\/api\/collection\/([^/]+)$/);
      const id = m?.[1];
      if (id && id !== 'embeddings') {
        if (method === 'GET') {
          const item = await getDemoItem(id);
          return item ? json({ item }) : json({ error: 'Not found.' }, 404);
        }
        if (method === 'PATCH') {
          const existing = (await getDemoItem(id)) as (CollectionItemDTO & { embedding?: number[] }) | null;
          if (!existing) return json({ error: 'Not found.' }, 404);
          const b = await readBody(init, input);
          const next = { ...existing, updatedAt: nowIso() } as CollectionItemDTO & { embedding?: number[] };
          if (typeof b.notes === 'string') next.notes = b.notes;
          if (['owned', 'wanted', 'sold', 'duplicate'].includes(b.status as string)) {
            next.status = b.status as ItemStatus;
          }
          if (Array.isArray(b.photos)) {
            next.photos = (b.photos as { url: string; width?: number; height?: number }[]).map((p) => ({
              url: p.url,
              width: p.width ?? 0,
              height: p.height ?? 0,
              uploadedAt: nowIso(),
            }));
          }
          await putDemoItem(next);
          return json({ item: next });
        }
        if (method === 'DELETE') {
          await deleteDemoItem(id);
          return json({ ok: true });
        }
      }
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'Demo store error.' }, 500);
    }

    // Unhandled API route in demo → empty-but-valid fallbacks where possible.
    return orig(input, init);
  };
}
