import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { requireUser, isErrorResponse, handleRouteError } from '@/lib/api-helpers';
import { toItemDTO } from '@/lib/dto';
import { findLikelyDuplicates, DUPLICATE_THRESHOLD } from '@/lib/similarity';
import type { CollectionItemDoc } from '@/models/CollectionItem';

export const dynamic = 'force-dynamic';

interface Body {
  upc?: unknown;
  embedding?: unknown;
}

/**
 * POST /api/duplicate-check — body `{embedding?, upc?}`.
 * UPC adds check `{userId, upc}` exactly; visual adds run cosine ≥ 0.85
 * against the user's library. Returns potential duplicates, best first.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (isErrorResponse(user)) return user;

  try {
    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });

    const db = await getDb();
    const col = db.collection<CollectionItemDoc>('collection_items');

    // 1. Exact UPC match.
    if (typeof body.upc === 'string' && /^\d{12,13}$/.test(body.upc)) {
      const matches = await col
        .find({ userId: user.id, upc: body.upc })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
      if (matches.length > 0) {
        return NextResponse.json({
          duplicates: matches.map((m) => ({ item: toItemDTO(m), score: 1, reason: 'upc' })),
          threshold: DUPLICATE_THRESHOLD,
        });
      }
    }

    // 2. Visual similarity.
    if (
      Array.isArray(body.embedding) &&
      body.embedding.length > 0 &&
      body.embedding.every((n) => typeof n === 'number' && Number.isFinite(n))
    ) {
      const query = body.embedding as number[];
      const candidates = await col
        .find(
          { userId: user.id, embedding: { $exists: true, $type: 'array' } },
          { projection: { embedding: 1 } },
        )
        .toArray();

      const hits = findLikelyDuplicates(
        query,
        candidates.map((c) => ({ id: c._id.toString(), embedding: c.embedding ?? [] })),
      ).slice(0, 5);

      if (hits.length > 0) {
        const docs = await col
          .find({ _id: { $in: hits.map((h) => new ObjectId(h.id)) }, userId: user.id })
          .toArray();
        const byId = new Map(docs.map((d) => [d._id.toString(), d]));
        return NextResponse.json({
          duplicates: hits.flatMap((h) => {
            const doc = byId.get(h.id);
            return doc ? [{ item: toItemDTO(doc), score: h.score, reason: 'visual' }] : [];
          }),
          threshold: DUPLICATE_THRESHOLD,
        });
      }
    }

    return NextResponse.json({ duplicates: [], threshold: DUPLICATE_THRESHOLD });
  } catch (err) {
    return handleRouteError(err);
  }
}
