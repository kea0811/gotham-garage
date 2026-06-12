/**
 * In-memory vector similarity. Brute-force cosine over the user's library is
 * fine for ≤5,000 items (PRD §7); upgrade to a vector index only if needed.
 */

/** Cosine similarity ≥ this means "you may already own this". */
export const DUPLICATE_THRESHOLD = 0.85;

/** Number of candidates shown in the visual-match grid. */
export const TOP_K = 12;

export interface EmbeddedItem {
  id: string;
  embedding: number[];
}

export interface ScoredItem {
  id: string;
  score: number;
}

/**
 * Cosine similarity between two equal-length vectors.
 * Returns 0 when either vector has zero magnitude (no direction → no match).
 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }
  if (a.length === 0) {
    throw new Error('Cannot compare empty vectors');
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] as number;
    const y = b[i] as number;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** L2-normalize a vector in place-free fashion. Zero vectors pass through. */
export function l2Normalize(v: readonly number[]): number[] {
  let sum = 0;
  for (const x of v) sum += x * x;
  const norm = Math.sqrt(sum);
  if (norm === 0) return [...v];
  return v.map((x) => x / norm);
}

/**
 * Top-K most similar items to `query`, descending by score.
 * Items whose embedding length differs from the query are skipped (defensive:
 * a model swap could leave stale embeddings in the library).
 */
export function topK(
  query: readonly number[],
  items: readonly EmbeddedItem[],
  k: number = TOP_K,
): ScoredItem[] {
  if (k <= 0) return [];
  const scored: ScoredItem[] = [];
  for (const item of items) {
    if (item.embedding.length !== query.length) continue;
    scored.push({ id: item.id, score: cosineSimilarity(query, item.embedding) });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

/** Items scoring at/above the duplicate threshold, best first. */
export function findLikelyDuplicates(
  query: readonly number[],
  items: readonly EmbeddedItem[],
  threshold: number = DUPLICATE_THRESHOLD,
): ScoredItem[] {
  return topK(query, items, items.length).filter((s) => s.score >= threshold);
}
