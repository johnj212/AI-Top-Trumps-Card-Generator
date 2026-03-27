#!/usr/bin/env node
// Generates minimal PNG icons for PWA — pure Node.js, no external deps
import { writeFileSync, mkdirSync } from 'fs';
import zlib from 'zlib';

// CRC32 table for PNG checksums
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

function generatePNG(size) {
  // Colors
  const bg = { r: 0x0a, g: 0x0a, b: 0x1a }; // #0a0a1a deep navy
  const fg = { r: 0x6c, g: 0x63, b: 0xff }; // #6c63ff arcade purple
  const ac = { r: 0xff, g: 0x6b, b: 0x35 }; // #ff6b35 arcade orange
  const wh = { r: 0xf0, g: 0xf0, b: 0xff }; // #f0f0ff near-white

  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // RGB color type
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const cx = size / 2;
  const cy = size / 2;

  // Card shape dimensions
  const cw = Math.floor(size * 0.52);
  const ch = Math.floor(size * 0.68);
  const cx0 = Math.floor(cx - cw / 2);
  const cy0 = Math.floor(cy - ch / 2);
  const r = Math.max(4, Math.floor(size * 0.08)); // corner radius

  // Star shape (6-point)
  function isStar(x, y) {
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const outer = size * 0.13;
    const inner = size * 0.06;
    if (dist > outer) return false;
    if (dist < inner) return true;
    const angle = (Math.atan2(dy, dx) * 6 / Math.PI + 12) % 2;
    const blend = (angle < 1) ? angle : 2 - angle;
    return dist < inner + (outer - inner) * blend;
  }

  // Rounded rect test
  function isInCard(x, y) {
    if (x < cx0 || x >= cx0 + cw || y < cy0 || y >= cy0 + ch) return false;
    // Check corners
    const inXEdge = x < cx0 + r || x >= cx0 + cw - r;
    const inYEdge = y < cy0 + r || y >= cy0 + ch - r;
    if (inXEdge && inYEdge) {
      const nearX = x < cx0 + r ? cx0 + r : cx0 + cw - r;
      const nearY = y < cy0 + r ? cy0 + r : cy0 + ch - r;
      const dx = x - nearX, dy = y - nearY;
      return dx * dx + dy * dy <= r * r;
    }
    return true;
  }

  // Card border glow (2px)
  function isCardBorder(x, y) {
    if (!isInCard(x, y)) return false;
    const bw = Math.max(2, Math.floor(size * 0.015));
    // Check if near edge
    return !isInCard(x - bw, y) || !isInCard(x + bw, y) ||
           !isInCard(x, y - bw) || !isInCard(x, y + bw);
  }

  // Subtle dot pattern on card
  function isDot(x, y) {
    const spacing = Math.max(8, Math.floor(size * 0.06));
    const rx = ((x - cx0) % spacing + spacing) % spacing;
    const ry = ((y - cy0) % spacing + spacing) % spacing;
    return rx === 0 && ry === 0;
  }

  // Build raw image data
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = [0]; // filter byte (none)
    for (let x = 0; x < size; x++) {
      const inCard = isInCard(x, y);
      const onBorder = isCardBorder(x, y);
      const star = isStar(x, y);

      if (star && inCard) {
        // Star: white
        row.push(wh.r, wh.g, wh.b);
      } else if (onBorder) {
        // Border glow: arcade purple
        row.push(fg.r, fg.g, fg.b);
      } else if (inCard) {
        // Card interior: dark navy with subtle dots
        if (isDot(x, y)) {
          row.push(fg.r >> 1, fg.g >> 1, fg.b >> 1);
        } else {
          row.push(0x12, 0x12, 0x2a); // #12122a
        }
      } else {
        // Background
        row.push(bg.r, bg.g, bg.b);
      }
    }
    rows.push(Buffer.from(row));
  }

  const rawData = Buffer.concat(rows);
  const compressed = zlib.deflateSync(rawData, { level: 6 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });

const configs = [
  { file: 'public/icons/icon-192.png',          size: 192 },
  { file: 'public/icons/icon-512.png',          size: 512 },
  { file: 'public/icons/icon-512-maskable.png', size: 512 },
  { file: 'public/apple-touch-icon.png',        size: 180 },
];

for (const { file, size } of configs) {
  writeFileSync(file, generatePNG(size));
  console.log(`Created ${file} (${size}×${size})`);
}
console.log('Icons generated successfully.');
