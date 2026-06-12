'use client';

/**
 * Client-side photo compression before upload (PRD §15: cap ~1 MB/photo to
 * keep storage costs near zero). Downscales to a max edge of 1600 px then walks JPEG
 * quality down until the blob fits the budget.
 */

export const TARGET_MAX_BYTES = 1024 * 1024; // ~1 MB
const MAX_EDGE_PX = 1600;

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that image.'));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image encode failed.'))),
      'image/jpeg',
      quality,
    );
  });
}

export async function compressImage(
  file: Blob,
  maxBytes: number = TARGET_MAX_BYTES,
): Promise<CompressedImage> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable in this browser.');
    ctx.drawImage(img, 0, 0, width, height);

    let blob = await canvasToBlob(canvas, 0.85);
    for (const quality of [0.7, 0.55, 0.4]) {
      if (blob.size <= maxBytes) break;
      blob = await canvasToBlob(canvas, quality);
    }
    return { blob, width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}
