import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  removeBackground: vi.fn(),
}));

// The ONNX model never loads in tests — the @imgly import is mocked.
vi.mock('@imgly/background-removal', () => ({ removeBackground: mocks.removeBackground }));

import { removeImageBackground } from '@/lib/bg-removal';

describe('removeImageBackground', () => {
  it('delegates to @imgly/background-removal with PNG output options', async () => {
    const input = new Blob(['raw'], { type: 'image/jpeg' });
    const output = new Blob(['cut'], { type: 'image/png' });
    mocks.removeBackground.mockResolvedValueOnce(output);

    await expect(removeImageBackground(input)).resolves.toBe(output);
    expect(mocks.removeBackground).toHaveBeenCalledWith(input, {
      output: { format: 'image/png', quality: 0.9 },
    });
  });

  it('propagates model failures so callers can fall back to the raw photo', async () => {
    mocks.removeBackground.mockRejectedValueOnce(new Error('wasm OOM'));
    await expect(removeImageBackground(new Blob(['x']))).rejects.toThrow('wasm OOM');
  });
});
