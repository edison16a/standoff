import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { Fighter } from "../engine/fighter";

/** A player the sound is mixed for: their fighter, and where their view sits from left (-1) to right (1). */
export interface Ear {
  id: number;
  pan: number;
}

/** A value nudged up or down by up to `spread` of itself, so repeats never sound identical. */
export function vary(value: number, spread = 0.05): number {
  return value * (1 + (Math.random() * 2 - 1) * spread);
}

/** A gain and a panner feeding a bus, torn down once its sounds have played. Returns the input. */
export function sendTo(engine: AudioEngine, bus: AudioNode, gain: number, pan = 0, lifeS = 3): GainNode {
  const { ctx } = engine;
  const input = ctx.createGain();
  input.gain.value = gain;
  const panner = ctx.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, pan));
  input.connect(panner).connect(bus);
  setTimeout(() => {
    input.disconnect();
    panner.disconnect();
  }, lifeS * 1000);
  return input;
}

/** How a sound at a spot reaches the room: loud as it is to the nearest player, from their side of the screen. */
export interface Placed {
  gain: number;
  pan: number;
  /** Metres to the nearest player's fighter. */
  distance: number;
  /** One of the players made it. */
  own: boolean;
}

/**
 * Places a sound for the people on the couch. Everyone shares one pair of
 * speakers, so a sound is as loud as it would be to the player nearest
 * it, and leans toward that player's view. A player's own shots are the
 * loudest thing they hear.
 */
export function place(at: { x: number; z: number }, ears: readonly Ear[], fighters: readonly Fighter[], source?: number): Placed {
  let best: Placed | null = null;
  for (const ear of ears) {
    if (ear.id === source) return { gain: 1, pan: ear.pan * 0.6, distance: 0, own: true };
    const f = fighters[ear.id];
    if (!f) continue;
    const distance = Math.hypot(at.x - f.pos.x, at.z - f.pos.z);
    // Falls to half at 14 metres and never quite to nothing: the field is small.
    const gain = Math.max(0.12, 1 / (1 + distance / 14));
    if (!best || gain > best.gain) best = { gain, pan: ear.pan * 0.6, distance, own: false };
  }
  return best ?? { gain: 0.35, pan: 0, distance: 30, own: false };
}
