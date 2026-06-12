import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  l2Normalize,
  topK,
  findLikelyDuplicates,
  DUPLICATE_THRESHOLD,
  TOP_K,
  type EmbeddedItem,
} from '@/lib/similarity';

describe('cosineSimilarity', () => {
  it('is 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10);
  });

  it('is 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
  });

  it('is -1 for opposite vectors', () => {
    expect(cosineSimilarity([2, 0], [-3, 0])).toBeCloseTo(-1, 10);
  });

  it('is scale-invariant', () => {
    expect(cosineSimilarity([1, 1], [10, 10])).toBeCloseTo(1, 10);
  });

  it('returns 0 when the first vector has zero magnitude', () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });

  it('returns 0 when the second vector has zero magnitude', () => {
    expect(cosineSimilarity([1, 2], [0, 0])).toBe(0);
  });

  it('throws on length mismatch', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow('Vector length mismatch: 2 vs 3');
  });

  it('throws on empty vectors', () => {
    expect(() => cosineSimilarity([], [])).toThrow('Cannot compare empty vectors');
  });
});

describe('l2Normalize', () => {
  it('normalizes to unit length', () => {
    const v = l2Normalize([3, 4]);
    expect(v[0]).toBeCloseTo(0.6, 10);
    expect(v[1]).toBeCloseTo(0.8, 10);
  });

  it('passes zero vectors through as a copy', () => {
    const input = [0, 0, 0];
    const out = l2Normalize(input);
    expect(out).toEqual([0, 0, 0]);
    expect(out).not.toBe(input);
  });
});

describe('topK', () => {
  const items: EmbeddedItem[] = [
    { id: 'exact', embedding: [1, 0] },
    { id: 'close', embedding: [1, 0.2] },
    { id: 'orthogonal', embedding: [0, 1] },
    { id: 'opposite', embedding: [-1, 0] },
  ];

  it('returns items sorted by descending similarity', () => {
    const result = topK([1, 0], items, 4);
    expect(result.map((r) => r.id)).toEqual(['exact', 'close', 'orthogonal', 'opposite']);
    expect(result[0]?.score).toBeCloseTo(1, 10);
  });

  it('slices to k results', () => {
    expect(topK([1, 0], items, 2)).toHaveLength(2);
  });

  it('returns empty for k <= 0', () => {
    expect(topK([1, 0], items, 0)).toEqual([]);
    expect(topK([1, 0], items, -1)).toEqual([]);
  });

  it('skips items whose embedding length differs from the query', () => {
    const mixed: EmbeddedItem[] = [
      { id: 'good', embedding: [1, 0] },
      { id: 'stale', embedding: [1, 0, 0] },
    ];
    expect(topK([1, 0], mixed, 5).map((r) => r.id)).toEqual(['good']);
  });

  it('defaults k to TOP_K (12)', () => {
    const many: EmbeddedItem[] = Array.from({ length: TOP_K + 3 }, (_, i) => ({
      id: `item-${i}`,
      embedding: [1, i / 100],
    }));
    expect(topK([1, 0], many)).toHaveLength(TOP_K);
  });
});

describe('findLikelyDuplicates', () => {
  const items: EmbeddedItem[] = [
    { id: 'dupe', embedding: [1, 0.01] },
    { id: 'similar-ish', embedding: [1, 0.9] },
    { id: 'different', embedding: [0, 1] },
  ];

  it('returns only items at/above the default 0.85 threshold, best first', () => {
    const hits = findLikelyDuplicates([1, 0], items);
    expect(hits.map((h) => h.id)).toEqual(['dupe']);
    expect(hits[0]?.score).toBeGreaterThanOrEqual(DUPLICATE_THRESHOLD);
  });

  it('honors a custom threshold', () => {
    const hits = findLikelyDuplicates([1, 0], items, 0.5);
    expect(hits.map((h) => h.id)).toEqual(['dupe', 'similar-ish']);
  });

  it('returns empty when nothing matches', () => {
    expect(findLikelyDuplicates([0, 1], [{ id: 'a', embedding: [1, 0] }])).toEqual([]);
  });
});
