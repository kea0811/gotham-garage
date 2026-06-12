import { NextResponse } from 'next/server';
import type { Filter } from 'mongodb';
import { getDb } from '@/lib/db';
import { requireUser, isErrorResponse, handleRouteError } from '@/lib/api-helpers';
import { toItemDTO } from '@/lib/dto';
import { parsePhotos } from '@/lib/validate';
import {
  ITEM_SOURCES,
  ITEM_STATUSES,
  type CollectionItemDoc,
} from '@/models/CollectionItem';

export const dynamic = 'force-dynamic';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const EMBEDDING_DIM = 384;

/** GET /api/collection — paginated list with search + filters. */
export async function GET(req: Request) {
  const user = await requireUser();
  if (isErrorResponse(user)) return user;

  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(
        1,
        Number.parseInt(url.searchParams.get('limit') ?? `${DEFAULT_PAGE_SIZE}`, 10) ||
          DEFAULT_PAGE_SIZE,
      ),
    );
    const q = url.searchParams.get('q')?.trim();
    const year = url.searchParams.get('year');
    const series = url.searchParams.get('series');
    const status = url.searchParams.get('status');

    const filter: Filter<CollectionItemDoc> = { userId: user.id };
    if (q) filter.$text = { $search: q };
    if (year && /^\d{4}$/.test(year)) filter.year = Number.parseInt(year, 10);
    if (series) filter.series = series;
    if (status && (ITEM_STATUSES as string[]).includes(status)) {
      filter.status = status as CollectionItemDoc['status'];
    }

    const db = await getDb();
    const col = db.collection<CollectionItemDoc>('collection_items');
    const [docs, total] = await Promise.all([
      col
        .find(filter)
        .sort(q ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      col.countDocuments(filter),
    ]);

    return NextResponse.json({
      items: docs.map(toItemDTO),
      page,
      limit,
      total,
      hasMore: page * limit < total,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

interface CreateBody {
  name?: unknown;
  year?: unknown;
  series?: unknown;
  castingName?: unknown;
  color?: unknown;
  baseCode?: unknown;
  upc?: unknown;
  photos?: unknown;
  embedding?: unknown;
  notes?: unknown;
  status?: unknown;
  source?: unknown;
}

function optionalString(v: unknown, max = 500): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined;
}

/** POST /api/collection — create a CollectionItem. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (isErrorResponse(user)) return user;

  try {
    const body = (await req.json().catch(() => null)) as CreateBody | null;
    const name = optionalString(body?.name, 200);
    if (!body || !name) {
      return NextResponse.json({ error: 'A car name is required.' }, { status: 400 });
    }

    const year =
      typeof body.year === 'number' && body.year >= 1900 && body.year <= 2100
        ? Math.trunc(body.year)
        : undefined;

    const upc = optionalString(body.upc, 13);
    if (upc && !/^\d{12,13}$/.test(upc)) {
      return NextResponse.json({ error: 'UPC must be 12 or 13 digits.' }, { status: 400 });
    }

    const embedding =
      Array.isArray(body.embedding) &&
      body.embedding.length === EMBEDDING_DIM &&
      body.embedding.every((n) => typeof n === 'number' && Number.isFinite(n))
        ? (body.embedding as number[])
        : undefined;

    const status = (ITEM_STATUSES as string[]).includes(body.status as string)
      ? (body.status as CollectionItemDoc['status'])
      : 'owned';
    const source = (ITEM_SOURCES as string[]).includes(body.source as string)
      ? (body.source as CollectionItemDoc['source'])
      : 'manual';

    const now = new Date();
    const doc: Omit<CollectionItemDoc, '_id'> = {
      userId: user.id,
      name,
      year,
      series: optionalString(body.series, 120),
      castingName: optionalString(body.castingName, 120),
      color: optionalString(body.color, 60),
      baseCode: optionalString(body.baseCode, 60),
      upc,
      photos: parsePhotos(body.photos),
      embedding,
      notes: optionalString(body.notes, 2000),
      status,
      source,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDb();
    const result = await db
      .collection<Omit<CollectionItemDoc, '_id'>>('collection_items')
      .insertOne(doc);

    return NextResponse.json(
      { item: toItemDTO({ ...doc, _id: result.insertedId } as CollectionItemDoc) },
      { status: 201 },
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
