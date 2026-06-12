import { l2Normalize } from '@/lib/similarity';

/**
 * DINOv2-small embeddings via transformers.js v3, fully in-browser.
 * The ~30 MB model is lazy-loaded on first visual-search use and cached by
 * the browser/service worker (PRD §7). This module must only run client-side.
 */

export const EMBEDDING_DIM = 384;
export const MODEL_ID = 'Xenova/dinov2-small';

/** Minimal shape of a transformers.js output tensor we rely on. */
export interface FeatureTensor {
  dims: number[];
  data: Float32Array | number[];
}

export type ImageFeatureExtractor = (input: string) => Promise<FeatureTensor>;

let extractorPromise: Promise<ImageFeatureExtractor> | null = null;

async function loadExtractor(): Promise<ImageFeatureExtractor> {
  const { pipeline } = await import('@huggingface/transformers');
  const extractor = await pipeline('image-feature-extraction', MODEL_ID);
  return extractor as unknown as ImageFeatureExtractor;
}

/** Memoized model load; a failed load is retryable on the next call. */
export function getExtractor(): Promise<ImageFeatureExtractor> {
  if (!extractorPromise) {
    extractorPromise = loadExtractor().catch((err: unknown) => {
      extractorPromise = null;
      throw err;
    });
  }
  return extractorPromise;
}

/**
 * Pull the CLS token (first token) out of a [batch, tokens, dim] feature
 * tensor and L2-normalize it. DINOv2's CLS token is its global image
 * descriptor — ideal for same-object retrieval.
 */
export function clsEmbedding(tensor: FeatureTensor): number[] {
  const dim = tensor.dims[tensor.dims.length - 1];
  if (!dim || dim <= 0) throw new Error('Embedding tensor has no feature dimension.');
  const cls = Array.from(tensor.data).slice(0, dim);
  return l2Normalize(cls);
}

/** Embed an image (object URL or data URL) into a normalized 384-dim vector. */
export async function embedImage(imageUrl: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(imageUrl);
  return clsEmbedding(output);
}

/** Test-only: reset the memoized extractor. */
export function resetEmbeddingStateForTests(): void {
  extractorPromise = null;
}
