import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUser, isErrorResponse, handleRouteError } from '@/lib/api-helpers';
import type { CollectionItemDoc } from '@/models/CollectionItem';

export const dynamic = 'force-dynamic';

/**
 * GET /api/collection/embeddings
 * `[{id, embedding}]` for the user's library. The client computes cosine
 * top-K in-browser; the service worker caches this response for offline use.
 */
export async function GET() {
  const user = await requireUser();
  if (isErrorResponse(user)) return user;

  try {
    const db = await getDb();
    const docs = await db
      .collection<CollectionItemDoc>('collection_items')
      .find(
        { userId: user.id, embedding: { $exists: true, $type: 'array' } },
        { projection: { embedding: 1 } },
      )
      .toArray();

    return NextResponse.json({
      embeddings: docs.map((d) => ({ id: d._id.toString(), embedding: d.embedding })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
