import { Rng } from "../../engine/rng";

/**
 * The echo of a gunshot in a city street, as an impulse response for a
 * convolver. Out in a street a shot is heard three ways: the direct bang,
 * a few sharp slaps off the facades on either side and the building at
 * the far end, then a long grey wash as those slaps scatter off every
 * window and car. This builds all but the direct bang, which the dry
 * path carries. Pure numbers, so it can be tested without Web Audio.
 */

export interface StreetShape {
  /** Metres from the team to the facades on its left and right. */
  left: number;
  right: number;
  /** Metres to the building closing the far end of the street. */
  far: number;
  /** Seconds for the scattered wash to fall by 60 dB. */
  rt60: number;
  /** Share of the sound a facade sends back on each bounce. */
  absorption: number;
}

/** A street about twenty metres wide with a block thirty metres on: the slap back the game's route is full of. */
export const STREET: StreetShape = { left: 8, right: 12, far: 30, rt60: 1.7, absorption: 0.7 };

const SOUND_SPEED = 343;

/** One discrete echo: when it arrives, how loud, how many bounces it took, and which side it comes from. */
export interface Reflection {
  delay: number;
  gain: number;
  order: number;
  /** -1 from the left, 1 from the right, 0 from straight ahead. */
  side: number;
}

/**
 * The flutter between the two facades, found with image sources: each
 * bounce mirrors the shooter across a wall, and the echo arrives from
 * where the mirror image stands. The far building adds a slap from ahead.
 */
export function reflections(shape: StreetShape, maxOrder = 6): Reflection[] {
  const seen = new Map<number, number>();
  let images = [0];
  for (let order = 1; order <= maxOrder; order++) {
    const next: number[] = [];
    for (const p of images) {
      for (const mirrored of [-2 * shape.left - p, 2 * shape.right - p]) {
        const key = Math.round(mirrored * 1000);
        if (seen.has(key) || mirrored === 0) continue;
        seen.set(key, order);
        next.push(mirrored);
      }
    }
    images = next;
  }
  const out: Reflection[] = [];
  for (const [key, order] of seen) {
    const x = key / 1000;
    const distance = Math.abs(x);
    out.push({ delay: distance / SOUND_SPEED, gain: shape.absorption ** order * Math.min(1, 12 / distance), order, side: Math.sign(x) });
  }
  // The block at the end of the street, and a weaker one beyond it.
  for (const [metres, gain] of [[shape.far, 0.45], [shape.far * 1.8, 0.2]] as const) {
    out.push({ delay: (2 * metres) / SOUND_SPEED, gain, order: 1, side: 0 });
  }
  return out.sort((a, b) => a.delay - b.delay);
}

/**
 * The stereo impulse response. Each echo is a short burst of noise rather
 * than a single sample, dulled a little more with every bounce, and the
 * wash behind them loses its highs faster than its lows, as air does.
 */
export function streetImpulse(sampleRate: number, shape: StreetShape = STREET, seed = 7): [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
  const rng = new Rng(seed);
  const length = Math.round(sampleRate * shape.rt60 * 1.15);
  const channels: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] = [new Float32Array(length), new Float32Array(length)];
  const echoes = reflections(shape);
  for (const echo of echoes) {
    channels.forEach((data, ch) => {
      // An echo from the left reaches the left ear first and louder.
      const facing = echo.side === 0 ? 1 : (ch === 0) === (echo.side < 0) ? 1 : 0.5;
      const lag = echo.side === 0 || facing === 1 ? 0 : 0.0004;
      burst(data, Math.round((echo.delay + lag) * sampleRate), echo.gain * facing, 9000 / (1 + 0.6 * echo.order), sampleRate, rng);
    });
  }
  const start = echoes[0]?.delay ?? 0.03;
  channels.forEach((data) => wash(data, start, shape.rt60, sampleRate, rng));
  normalise(channels);
  return channels;
}

/** A 2 ms decaying noise burst through a one pole low pass, added at `at`. */
function burst(data: Float32Array, at: number, gain: number, cutoff: number, sampleRate: number, rng: Rng): void {
  const n = Math.round(sampleRate * 0.004);
  const a = Math.exp((-2 * Math.PI * cutoff) / sampleRate);
  let y = 0;
  for (let i = 0; i < n && at + i < data.length; i++) {
    const x = (rng.next() * 2 - 1) * Math.exp(-i / (sampleRate * 0.0012));
    y = (1 - a) * x + a * y;
    data[at + i]! += y * gain * 3;
  }
}

/** The diffuse tail: noise swelling in after the first echo, then decaying, its cutoff falling with time. */
function wash(data: Float32Array, start: number, rt60: number, sampleRate: number, rng: Rng): void {
  let y = 0;
  for (let i = Math.round(start * sampleRate); i < data.length; i++) {
    const t = i / sampleRate;
    const swell = Math.min(1, (t - start) / 0.12);
    const level = 0.22 * swell * Math.exp((-6.91 * t) / rt60);
    const cutoff = 600 + 7000 * Math.exp(-t / 0.5);
    const a = Math.exp((-2 * Math.PI * cutoff) / sampleRate);
    y = (1 - a) * (rng.next() * 2 - 1) + a * y;
    data[i]! += y * level * 2;
  }
}

function normalise(channels: Float32Array[]): void {
  let peak = 0;
  for (const data of channels) for (const v of data) peak = Math.max(peak, Math.abs(v));
  if (peak === 0) return;
  for (const data of channels) for (let i = 0; i < data.length; i++) data[i]! /= peak;
}
