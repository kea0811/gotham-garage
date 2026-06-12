import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pipeline: vi.fn(),
}));

// Never download model weights in tests — the transformers import is mocked.
vi.mock('@huggingface/transformers', () => ({ pipeline: mocks.pipeline }));

import {
  EMBEDDING_DIM,
  MODEL_ID,
  clsEmbedding,
  embedImage,
  getExtractor,
  resetEmbeddingStateForTests,
  type FeatureTensor,
} from '@/lib/embedding';

beforeEach(() => {
  resetEmbeddingStateForTests();
  mocks.pipeline.mockReset();
});

describe('constants', () => {
  it('targets DINOv2-small at 384 dims', () => {
    expect(EMBEDDING_DIM).toBe(384);
    expect(MODEL_ID).toBe('Xenova/dinov2-small');
  });
});

describe('getExtractor', () => {
  it('loads the image-feature-extraction pipeline once and memoizes it', async () => {
    const extractor = vi.fn();
    mocks.pipeline.mockResolvedValue(extractor);

    const first = await getExtractor();
    const second = await getExtractor();
    expect(first).toBe(second);
    expect(mocks.pipeline).toHaveBeenCalledTimes(1);
    expect(mocks.pipeline).toHaveBeenCalledWith('image-feature-extraction', MODEL_ID);
  });

  it('retries after a failed load instead of caching the failure', async () => {
    mocks.pipeline.mockRejectedValueOnce(new Error('download failed'));
    await expect(getExtractor()).rejects.toThrow('download failed');

    const extractor = vi.fn();
    mocks.pipeline.mockResolvedValueOnce(extractor);
    await expect(getExtractor()).resolves.toBe(extractor);
    expect(mocks.pipeline).toHaveBeenCalledTimes(2);
  });
});

describe('clsEmbedding', () => {
  it('takes the CLS token (first row) and L2-normalizes it', () => {
    const tensor: FeatureTensor = {
      dims: [1, 3, 2],
      data: new Float32Array([3, 4, 9, 9, 9, 9]), // CLS = [3, 4]
    };
    const out = clsEmbedding(tensor);
    expect(out).toHaveLength(2);
    expect(out[0]).toBeCloseTo(0.6, 6);
    expect(out[1]).toBeCloseTo(0.8, 6);
  });

  it('accepts plain number[] data', () => {
    const out = clsEmbedding({ dims: [1, 2, 2], data: [0, 2, 5, 5] });
    expect(out).toEqual([0, 1]);
  });

  it('throws when the tensor has no feature dimension', () => {
    expect(() => clsEmbedding({ dims: [], data: [] })).toThrow(
      'Embedding tensor has no feature dimension.',
    );
    expect(() => clsEmbedding({ dims: [1, 0], data: [] })).toThrow(/no feature dimension/);
    expect(() => clsEmbedding({ dims: [1, -2], data: [] })).toThrow(/no feature dimension/);
  });
});

describe('embedImage', () => {
  it('runs the extractor on the image URL and returns the normalized CLS vector', async () => {
    const tensor: FeatureTensor = { dims: [1, 2, 3], data: [0, 3, 4, 7, 7, 7] };
    const extractor = vi.fn(async (input: string) => {
      expect(input).toBe('blob:photo');
      return tensor;
    });
    mocks.pipeline.mockResolvedValue(extractor);

    const out = await embedImage('blob:photo');
    expect(extractor).toHaveBeenCalledWith('blob:photo');
    expect(out[0]).toBeCloseTo(0, 6);
    expect(out[1]).toBeCloseTo(0.6, 6);
    expect(out[2]).toBeCloseTo(0.8, 6);
  });
});
