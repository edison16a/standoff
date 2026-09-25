import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";

/**
 * The gym band: a mellow horn section for the hook, a Rhodes piano,
 * a sub bass, and a dusty hip hop kit with a little vinyl crackle. Every
 * voice is soft edged and a touch uneven, so the loop feels played.
 */

/** A small random spread around 1, so repeated hits never sound stamped out. */
export function human(spread = 0.12): number {
  return 1 - spread / 2 + Math.random() * spread;
}

/** A mellow horn: two detuned saws through a filter that opens as the note speaks, over a sine. */
export function horn(engine: AudioEngine, out: AudioNode, note: number, at: number, length: number, peak: number): void {
  const { ctx } = engine;
  const f = midi(note);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 0.7;
  filter.frequency.setValueAtTime(500, at);
  filter.frequency.linearRampToValueAtTime(1500, at + 0.06);
  filter.frequency.exponentialRampToValueAtTime(900, at + length);
  const gain = ctx.createGain();
  const p = peak * human(0.1);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(p, at + 0.035);
  gain.gain.setValueAtTime(p * 0.8, at + Math.max(0.05, length * 0.75));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length + 0.1);
  filter.connect(gain).connect(out);
  for (const [type, detune] of [["sawtooth", -8], ["sawtooth", 8], ["sine", 0]] as const) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f * 0.985, at);
    osc.frequency.exponentialRampToValueAtTime(f, at + 0.04);
    osc.detune.value = detune;
    osc.connect(filter);
    osc.start(at);
    osc.stop(at + length + 0.15);
    if (type === "sine") osc.onended = () => gain.disconnect();
  }
}

/** A Rhodes chord: sines with a bell like overtone, rolled a hair so it sounds played. */
export function rhodes(engine: AudioEngine, out: AudioNode, notes: readonly number[], at: number, length: number, peak: number): void {
  const p = peak * human();
  notes.forEach((note, i) => {
    const t = at + i * 0.012;
    tone(engine, out, t, { frequency: midi(note), attack: 0.005, decay: length, peak: p });
    tone(engine, out, t, { frequency: midi(note) * 3.01, attack: 0.002, decay: 0.12, peak: p * 0.2 });
  });
}

/** A vibraphone note for the B section's answer: soft, round and ringing. */
export function vibes(engine: AudioEngine, out: AudioNode, note: number, at: number, peak: number): void {
  const f = midi(note);
  const p = peak * human();
  tone(engine, out, at, { frequency: f, attack: 0.003, decay: 1.1, peak: p });
  tone(engine, out, at, { frequency: f * 4, attack: 0.002, decay: 0.2, peak: p * 0.15 });
  tone(engine, out, at, { type: "triangle", frequency: f, detune: 6, attack: 0.003, decay: 0.5, peak: p * 0.3 });
}

/** A round sub bass that slides a little into each note. */
export function sub(engine: AudioEngine, out: AudioNode, note: number, at: number, length: number, peak = 0.26): void {
  const f = midi(note);
  tone(engine, out, at, { frequency: f * 1.03, glideTo: f, attack: 0.008, decay: length, peak: peak * human(0.08) });
  tone(engine, out, at, { type: "triangle", frequency: f * 2, attack: 0.006, decay: length * 0.5, peak: peak * 0.12 });
}

/** The dusty kit. Kick and snare are layered, the hats are soft and the crackle is barely there. */
export const kit = {
  kick(engine: AudioEngine, out: AudioNode, at: number, peak = 0.4): void {
    const p = peak * human(0.1);
    tone(engine, out, at, { frequency: 120, glideTo: 45, decay: 0.26, peak: p });
    noise(engine, out, at, { filter: "lowpass", frequency: 900, decay: 0.02, peak: p * 0.25 });
  },
  snare(engine: AudioEngine, out: AudioNode, at: number, peak = 0.14): void {
    const p = peak * human(0.12);
    noise(engine, out, at, { filter: "bandpass", frequency: 1700, q: 0.8, decay: 0.16, peak: p });
    noise(engine, out, at, { filter: "lowpass", frequency: 3200, decay: 0.08, peak: p * 0.5 });
    tone(engine, out, at, { type: "triangle", frequency: 190, glideTo: 150, decay: 0.07, peak: p * 0.8 });
  },
  hat(engine: AudioEngine, out: AudioNode, at: number, peak = 0.03): void {
    noise(engine, out, at, { filter: "highpass", frequency: 7500, attack: 0.002, decay: 0.035, peak: peak * human(0.4) });
  },
  crackle(engine: AudioEngine, out: AudioNode, at: number): void {
    if (Math.random() < 0.35) noise(engine, out, at + Math.random() * 0.1, { filter: "highpass", frequency: 3000, attack: 0.001, decay: 0.004, peak: 0.02 * Math.random() });
  },
};

/** The winner's brass fanfare: a rising call, a held chord, a timpani roll and a cymbal. */
export function fanfare(engine: AudioEngine, out: AudioNode): void {
  const at = engine.now + 0.05;
  [57, 62, 66, 69].forEach((note, i) => horn(engine, out, note + 12, at + i * 0.13, 0.16, 0.05));
  const held = at + 0.6;
  for (const note of [74, 78, 81, 86]) horn(engine, out, note - 12, held, 1.6, 0.035);
  horn(engine, out, 86, held, 1.6, 0.05);
  for (let i = 0; i < 10; i++) tone(engine, out, at + i * 0.055, { frequency: 73, glideTo: 60, decay: 0.12, peak: 0.08 + i * 0.012 });
  tone(engine, out, held, { frequency: 73, glideTo: 50, decay: 1.2, peak: 0.3 });
  noise(engine, out, held, { filter: "highpass", frequency: 5000, attack: 0.005, decay: 1.6, peak: 0.1 });
}
