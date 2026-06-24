// Generates solid-colour demo PNG placeholders for every game asset slot, sized correctly,
// with the dimensions baked into each filename (e.g. character_MIR_MODON__600x800.png).
// Replace each file with your real artwork at the same size, then upload via /admin.
//
// Run:  node scripts/gen-demo-assets.mjs   -> writes to assets/demo/

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
};
const png = (w, h, [r, g, b, a]) => {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    const off = y * (1 + w * 4);
    raw[off] = 0; // filter: none
    for (let x = 0; x < w; x++) {
      const p = off + 1 + x * 4;
      raw[p] = r; raw[p + 1] = g; raw[p + 2] = b; raw[p + 3] = a;
    }
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};

const GREEN = [46, 107, 62, 255];
const RED = [158, 43, 37, 255];
const GOLD = [201, 162, 75, 255];

// [slot, width, height, colour]
const slots = [
  ['game_logo', 512, 512, GOLD],
  ['captain_card', 128, 128, GOLD],
  ['stamp_nawab', 256, 256, GREEN],
  ['stamp_eic', 256, 256, RED],
  ['voting_yes', 256, 256, GREEN],
  ['voting_no', 256, 256, RED],
  ['mission_success', 512, 512, GREEN],
  ['mission_betrayer', 512, 512, RED],
  ['character_SIRAJ', 600, 800, GREEN],
  ['character_MIR_MODON', 600, 800, GREEN],
  ['character_NAWAB', 600, 800, GREEN],
  ['character_MOHAN_LAL', 600, 800, GREEN],
  ['character_SAINT_FRAIS', 600, 800, GREEN],
  ['character_DEBUSI', 600, 800, GREEN],
  ['character_LUTFUNNESSA', 600, 800, GREEN],
  ['character_MIR_ZAFAR', 600, 800, RED],
  ['character_GHASETI_BEGUM', 600, 800, RED],
  ['character_EIC', 600, 800, RED],
  ['character_RAI_DURLABH', 600, 800, RED],
  ['character_UMICHAND', 600, 800, RED],
];

const dir = join(process.cwd(), 'assets', 'demo');
mkdirSync(dir, { recursive: true });
for (const [slot, w, h, color] of slots) {
  writeFileSync(join(dir, `${slot}__${w}x${h}.png`), png(w, h, color));
}
console.log(`Generated ${slots.length} demo PNGs in assets/demo/`);
