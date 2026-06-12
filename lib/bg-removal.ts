/**
 * @imgly/background-removal wrapper. Runs an ONNX model in WASM/WebGPU in the
 * browser — zero server cost, photos never leave the device until saved.
 * Client-side only; imported dynamically so it stays out of the shell bundle.
 */

export async function removeImageBackground(input: Blob): Promise<Blob> {
  const { removeBackground } = await import('@imgly/background-removal');
  return removeBackground(input, {
    output: { format: 'image/png', quality: 0.9 },
  });
}
