/**
 * Dependency-free PWA icon generator. Draws the Pitstop mark — a wheel/pit
 * marker on the dark theme background — and writes real PNGs via zlib.
 * Run once with: pnpm icons
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const BG = [0x07, 0x07, 0x0c];
const PANEL = [0x10, 0x10, 0x18];
const ACCENT = [0xa7, 0x8b, 0xfa];
const INK = [0xf4, 0xf4, 0xf7];

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(pixels, size) {
  // Raw scanlines with filter byte 0.
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0;
    pixels.copy(raw, row + 1, y * size * 3, (y + 1) * size * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function drawIcon(size, { maskable }) {
  const px = Buffer.alloc(size * size * 3);
  const set = (x, y, [r, g, b]) => {
    const i = (y * size + x) * 3;
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
  };
  const cx = size / 2;
  const cy = size / 2;
  // Maskable icons need ~20% safe-zone padding.
  const R = size * (maskable ? 0.32 : 0.4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      let color = BG;
      if (d < R) color = ACCENT; // tire ring
      if (d < R * 0.72) color = PANEL; // rim
      if (d < R * 0.3) color = ACCENT; // hub
      // Speed stripe through the right side.
      const stripeHalf = size * 0.035;
      if (
        Math.abs(dy) < stripeHalf &&
        x > cx + R * 0.85 &&
        x < cx + R * 0.85 + size * 0.16
      ) {
        color = INK;
      }
      set(x, y, color);
    }
  }
  return encodePng(px, size);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'icon-192.png'), drawIcon(192, { maskable: false }));
writeFileSync(join(OUT_DIR, 'icon-512.png'), drawIcon(512, { maskable: false }));
writeFileSync(join(OUT_DIR, 'icon-maskable-512.png'), drawIcon(512, { maskable: true }));
console.log('icons written to', OUT_DIR);
