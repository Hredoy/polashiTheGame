// Synthesizes a seamless, loopable war-drum background tune as a 16-bit PCM WAV and writes it
// to android/app/src/main/res/raw/battle_theme.wav (Android raw resource -> R.raw.battle_theme).
// No external asset needed. Replace the file with your own music later if you like.
//
// Run:  node scripts/gen-battle-theme.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const rate = 22050;
const bpm = 92;
const beat = 60 / bpm;
const beats = 16; // two bars of 8 -> seamless loop
const dur = beat * beats;
const N = Math.floor(rate * dur);
const buf = new Float32Array(N);

// A drum hit: pitch-dropping sine with exponential decay (the "boom" of a war drum).
function hit(t0, freq, decay, amp) {
  const start = Math.floor(t0 * rate);
  const len = Math.floor(decay * 5 * rate);
  for (let i = 0; i < len; i++) {
    const idx = (start + i) % N; // wrap so tails near the loop point stay seamless
    const tt = i / rate;
    const env = Math.exp(-tt / decay);
    const f = freq * (1 + 0.6 * Math.exp(-tt / 0.04)); // punchy pitch drop
    buf[idx] += amp * env * Math.sin(2 * Math.PI * f * tt);
  }
}

// Groove: strong downbeats, mid backbeats, light off-beat ticks.
for (let b = 0; b < beats; b++) {
  const t = b * beat;
  if (b % 4 === 0) hit(t, 52, 0.30, 0.95);
  else if (b % 2 === 0) hit(t, 66, 0.20, 0.55);
  else hit(t, 60, 0.16, 0.4);
  hit(t + beat / 2, 190, 0.05, 0.16); // tabla-ish tick
}

// Low war-horn drone with slow swell, for atmosphere.
for (let i = 0; i < N; i++) {
  const t = i / rate;
  const swell = 0.6 + 0.4 * Math.sin((2 * Math.PI * t) / dur);
  buf[i] += 0.07 * swell * Math.sin(2 * Math.PI * 82 * t);
  buf[i] += 0.04 * swell * Math.sin(2 * Math.PI * 123 * t);
}

// Normalise to avoid clipping.
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(buf[i]));
const norm = peak > 0 ? 0.92 / peak : 1;

const out = Buffer.alloc(44 + N * 2);
out.write('RIFF', 0);
out.writeUInt32LE(36 + N * 2, 4);
out.write('WAVE', 8);
out.write('fmt ', 12);
out.writeUInt32LE(16, 16);
out.writeUInt16LE(1, 20); // PCM
out.writeUInt16LE(1, 22); // mono
out.writeUInt32LE(rate, 24);
out.writeUInt32LE(rate * 2, 28);
out.writeUInt16LE(2, 32);
out.writeUInt16LE(16, 34);
out.write('data', 36);
out.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) {
  const s = Math.max(-1, Math.min(1, buf[i] * norm));
  out.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
}

const dir = join(process.cwd(), 'android/app/src/main/res/raw');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'battle_theme.wav'), out);
console.log(`wrote battle_theme.wav  ${(out.length / 1024).toFixed(0)} KB  ${dur.toFixed(1)}s`);
