import type { AudioEngine } from "@/platform/audio/audio-engine";

/** A value nudged up or down by up to `spread` of itself, so repeats never sound identical. */
export function vary(value: number, spread = 0.05): number {
  return value * (1 + (Math.random() * 2 - 1) * spread);
}

export interface Room {
  /** Send a layer here and it blooms into the reverb. */
  input: AudioNode;
  dispose(): void;
}

/**
 * An open air reverb: a convolver fed with decaying stereo noise, so
 * nothing has to load. Hits send a little of their tail into it, which
 * is what makes a slam sound like it rang round the stage.
 */
export function createRoom(engine: AudioEngine, destination: AudioNode, seconds: number, level: number): Room {
  const { ctx } = engine;
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.2);
  }
  const input = ctx.createGain();
  const convolver = ctx.createConvolver();
  convolver.buffer = impulse;
  // The tail loses its highs first, so it never hisses.
  const damp = ctx.createBiquadFilter();
  damp.type = "lowpass";
  damp.frequency.value = 3400;
  const out = ctx.createGain();
  out.gain.value = level;
  input.connect(convolver).connect(damp).connect(out).connect(destination);
  return { input, dispose: () => out.disconnect() };
}
