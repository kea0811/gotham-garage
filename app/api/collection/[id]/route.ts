import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { requireUser, isErrorResponse, handleRouteError } from '@/lib/api-helpers';
import { toItemDTO } from '@/lib/dto';
import { parsePhotos } from '@/lib/validate';
import { ITEM_STATUSES, type CollectionItemDoc } from '@/models/CollectionItem';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

async function resolveItemId(ctx: Ctx): Promise<ObjectId | null> {
  const { id } = await ctx.params;
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

/** GET /api/collection/[id] */
export async function GET(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (isErrorResponse(user)) return user;

  try {
    const itemId = await resolveItemId(ctx);
    if (!itemId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const db = await getDb();
    const doc = await db
      .collection<CollectionItemDoc>('collection_items')
      .findOne({ _id: itemId, userId: user.id });
    if (!doc) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json({ item: toItemDTO(doc) });
  } catch (err) {
    return handleRouteError(err);
  }
}

const PATCHABLE_STRINGS = ['name', 'series', 'castingName', 'color', 'baseCode', 'notes'] as const;

/** PATCH /api/collection/[id] — partial update of editable fields + photos. */
export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (isErrorResponse(user)) return user;

  try {
    const itemId = await resolveItemId(ctx);
    if (!itemId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });

    const $set: Record<string, unknown> = { updatedAt: new Date() };
    const $unset: Record<string, ''> = {};

    for (const key of PATCHABLE_STRINGS) {
      if (!(key in body)) continue;
      const v = body[key];
      if (typeof v === 'string' && v.trim()) $set[key] = v.trim().slice(0, 2000);
      else if (key !== 'name') $unset[key] = '';
    }
    if ('year' in body) {
      const y = body.year;
      if (typeof y === 'number' && y >= 1900 && y <= 2100) $set.year = Math.trunc(y);
      else $unset.year = '';
    }
    if ('status' in body && (ITEM_STATUSES as string[]).includes(body.status as string)) {
      $set.status = body.status;
    }
    if ('photos' in body) {
      // Photos are uploaded client-direct to Supabase Storage; the client
      // PATCHes the resulting URLs back onto the item.
      $set.photos = parsePhotos(body.photos);
    }
    if (
      'embedding' in body &&
      Array.isArray(body.embedding) &&
      body.embedding.every((n) => typeof n === 'number' && Number.isFinite(n))
    ) {
      $set.embedding = body.embedding;
    }

    const db = await getDb();
    const doc = await db.collection<CollectionItemDoc>('collection_items').findOneAndUpdate(
      { _id: itemId, userId: user.id },
      Object.keys($unset).length ? { $set, $unset } : { $set },
      { returnDocument: 'after' },
    );
    if (!doc) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json({ item: toItemDTO(doc) });
  } catch (err) {
    return handleRouteError(err);
  }
}

/** DELETE /api/collection/[id] */
export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (isErrorResponse(user)) return user;

  try {
    const itemId = await resolveItemId(ctx);
    if (!itemId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const db = await getDb();
    const result = await db
      .collection<CollectionItemDoc>('collection_items')
      .deleteOne({ _id: itemId, userId: user.id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
