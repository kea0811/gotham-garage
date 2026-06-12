import { NextResponse } from 'next/server';
import { searchProducts, RATE_LIMIT_MESSAGE } from '@/lib/upcitemdb';
import { handleRouteError } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/upc/search?q=...
 * Keyword catalog search (for adding a wishlist car you don't own). Public for
 * the same reasons as the barcode lookup: no user data, and demo guests use it.
 * Each result carries a barcode so it can be saved + deduped like a scan.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (!q) {
    return NextResponse.json({ error: 'Type something to search for.' }, { status: 400 });
  }

  try {
    const result = await searchProducts(q);
    if (result.status === 'rate_limited') {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }
    if (result.status === 'error') {
      return NextResponse.json({ error: result.message }, { status: 502 });
    }
    return NextResponse.json({ results: result.hits });
  } catch (err) {
    return handleRouteError(err);
  }
}
