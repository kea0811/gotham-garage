import { NextResponse } from 'next/server';
import { getDb, isDbConfigured } from '@/lib/db';
import { isValidUpc, lookupUpc, RATE_LIMIT_MESSAGE } from '@/lib/upcitemdb';
import { requireUser, isErrorResponse, handleRouteError } from '@/lib/api-helpers';
import type { UpcCacheDoc } from '@/models/UpcCache';

export const dynamic = 'force-dynamic';

/**
 * GET /api/upc/[code]
 * Cache hit → 200 immediately. Miss → upcitemdb → cache forever → 200.
 * 404 when unknown; 429 when the free daily quota is exhausted.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const user = await requireUser();
  if (isErrorResponse(user)) return user;

  const { code } = await params;
  if (!isValidUpc(code)) {
    return NextResponse.json({ error: 'UPC must be 12 or 13 digits.' }, { status: 400 });
  }

  try {
    // 1. Permanent cache — a UPC's metadata is immutable (PRD §10).
    if (isDbConfigured()) {
      const db = await getDb();
      const cached = await db.collection<UpcCacheDoc>('upc_cache').findOne({ upc: code });
      if (cached) {
        return NextResponse.json({ source: 'cache', data: cached.data });
      }
    }

    // 2. Live lookup.
    const result = await lookupUpc(code);

    if (result.status === 'rate_limited') {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }
    if (result.status === 'error') {
      return NextResponse.json({ error: result.message }, { status: 502 });
    }
    if (result.status === 'not_found') {
      // Log misses so alternative sources can be prioritized later (PRD §15).
      if (isDbConfigured()) {
        const db = await getDb();
        await db
          .collection('upc_misses')
          .updateOne(
            { upc: code },
            { $set: { upc: code, lastMissAt: new Date() }, $inc: { count: 1 } },
            { upsert: true },
          );
      }
      return NextResponse.json(
        { error: 'No match for that barcode. Enter the details manually.' },
        { status: 404 },
      );
    }

    // 3. Cache forever.
    if (isDbConfigured()) {
      const db = await getDb();
      await db.collection('upc_cache').updateOne(
        { upc: code },
        {
          $setOnInsert: {
            upc: code,
            source: 'upcitemdb',
            data: result.data,
            fetchedAt: new Date(),
            expiresAt: null,
          },
        },
        { upsert: true },
      );
    }

    return NextResponse.json({
      source: 'upcitemdb',
      data: result.data,
      remaining: result.remaining,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
