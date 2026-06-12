import type { CollectionItemDoc, CollectionItemDTO } from '@/models/CollectionItem';

/** ObjectId/Date → JSON-safe shape for the client. */
export function toItemDTO(doc: CollectionItemDoc): CollectionItemDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    year: doc.year,
    series: doc.series,
    castingName: doc.castingName,
    color: doc.color,
    baseCode: doc.baseCode,
    upc: doc.upc,
    photos: (doc.photos ?? []).map((p) => ({
      url: p.url,
      width: p.width,
      height: p.height,
      uploadedAt: new Date(p.uploadedAt).toISOString(),
    })),
    notes: doc.notes,
    status: doc.status,
    source: doc.source,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}
