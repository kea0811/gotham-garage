import type { UpcProductData } from '@/models/UpcCache';

/**
 * upcitemdb trial endpoint wrapper. No API key, 100 lookups/day.
 * Every successful lookup is cached forever in `upc_cache` (a UPC's metadata
 * is immutable) — see /api/upc/[code].
 */

const DEFAULT_BASE = 'https://api.upcitemdb.com/prod/trial';

/** User-facing copy when the free daily quota is exhausted (PRD §10). */
export const RATE_LIMIT_MESSAGE =
  "Daily lookup limit reached — try again tomorrow, or enter the car's details manually.";

export type UpcLookupResult =
  | { status: 'ok'; data: UpcProductData; remaining: number | null }
  | { status: 'not_found' }
  | { status: 'rate_limited'; message: string }
  | { status: 'error'; message: string };

interface UpcItemDbItem {
  title?: string;
  brand?: string;
  description?: string;
  images?: string[];
  category?: string;
  upc?: string;
  ean?: string;
}

interface UpcItemDbResponse {
  code?: string;
  items?: UpcItemDbItem[];
}

/** A keyword-search result: catalog metadata plus the barcode we key it by. */
export interface UpcSearchHit {
  upc: string;
  data: UpcProductData;
}

export type UpcSearchResult =
  | { status: 'ok'; hits: UpcSearchHit[] }
  | { status: 'rate_limited'; message: string }
  | { status: 'error'; message: string };

/** Prefer the 12-digit UPC, fall back to the 13-digit EAN; null if neither is usable. */
function pickCode(item: UpcItemDbItem): string | null {
  for (const code of [item.upc, item.ean]) {
    if (typeof code === 'string' && isValidUpc(code)) return code;
  }
  return null;
}

/** True for 12-digit UPC-A or 13-digit EAN-13 codes. */
export function isValidUpc(code: string): boolean {
  return /^\d{12,13}$/.test(code);
}

/** Pick the fields we persist from a raw upcitemdb item. */
export function normalizeItem(item: UpcItemDbItem): UpcProductData {
  return {
    title: item.title ?? 'Unknown item',
    brand: item.brand || undefined,
    description: item.description || undefined,
    images: Array.isArray(item.images) ? item.images.filter((u) => typeof u === 'string') : [],
    category: item.category || undefined,
  };
}

/**
 * Look up a UPC against upcitemdb. Network/parse failures are returned as
 * values, never thrown — callers branch on `status`.
 */
export async function lookupUpc(
  upc: string,
  options: { fetchImpl?: typeof fetch; baseUrl?: string } = {},
): Promise<UpcLookupResult> {
  if (!isValidUpc(upc)) {
    return { status: 'error', message: 'UPC must be 12 or 13 digits.' };
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const base = options.baseUrl ?? process.env.UPCITEMDB_BASE ?? DEFAULT_BASE;

  let res: Response;
  try {
    res = await fetchImpl(`${base}/lookup?upc=${encodeURIComponent(upc)}`, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    return { status: 'error', message: 'Could not reach the UPC lookup service.' };
  }

  if (res.status === 404) return { status: 'not_found' };
  if (res.status === 429 || res.status >= 500) {
    return { status: 'rate_limited', message: RATE_LIMIT_MESSAGE };
  }
  if (!res.ok) {
    return { status: 'error', message: `UPC lookup failed (HTTP ${res.status}).` };
  }

  let body: UpcItemDbResponse;
  try {
    body = (await res.json()) as UpcItemDbResponse;
  } catch {
    return { status: 'error', message: 'UPC lookup returned an unreadable response.' };
  }

  const first = body.items?.[0];
  if (body.code !== 'OK' || !first) return { status: 'not_found' };

  const remainingHeader = res.headers.get('X-RateLimit-Remaining');
  const remaining = remainingHeader !== null ? Number.parseInt(remainingHeader, 10) : null;

  return {
    status: 'ok',
    data: normalizeItem(first),
    remaining: remaining !== null && Number.isNaN(remaining) ? null : remaining,
  };
}

/**
 * Keyword-search the upcitemdb catalog (e.g. to add a car to your wishlist
 * without owning it). Only hits that carry a usable barcode are returned, so
 * each can be saved and deduped like a scanned car. Failures are returned as
 * values, never thrown — callers branch on `status`.
 */
export async function searchProducts(
  query: string,
  options: { fetchImpl?: typeof fetch; baseUrl?: string } = {},
): Promise<UpcSearchResult> {
  const q = query.trim();
  if (!q) return { status: 'error', message: 'Type something to search for.' };

  const fetchImpl = options.fetchImpl ?? fetch;
  const base = options.baseUrl ?? process.env.UPCITEMDB_BASE ?? DEFAULT_BASE;

  let res: Response;
  try {
    res = await fetchImpl(`${base}/search?s=${encodeURIComponent(q)}&type=product`, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    return { status: 'error', message: 'Could not reach the catalog search service.' };
  }

  if (res.status === 429 || res.status >= 500) {
    return { status: 'rate_limited', message: RATE_LIMIT_MESSAGE };
  }
  if (!res.ok) {
    return { status: 'error', message: `Catalog search failed (HTTP ${res.status}).` };
  }

  let body: UpcItemDbResponse;
  try {
    body = (await res.json()) as UpcItemDbResponse;
  } catch {
    return { status: 'error', message: 'Catalog search returned an unreadable response.' };
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const hits: UpcSearchHit[] = [];
  for (const item of items) {
    const code = pickCode(item);
    if (code) hits.push({ upc: code, data: normalizeItem(item) });
  }
  return { status: 'ok', hits };
}
