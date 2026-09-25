import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";

/**
 * The little boardwalk band both tunes are played by: a music box, a
 * whistled lead, a strummed ukulele, an upright bass, a soft reed organ
 * and a brushed kit. Every voice is soft edged and a touch uneven in
 * level, so the loop sounds played rather than sequenced.
 */

/** A small random spread around 1, so repeated notes never sound stamped out. */
export function human(spread = 0.12): number {
  return 1 - spread / 2 + Math.random() * spread;
}

/** A music box tine: a pure note with a faint metallic overtone and a long ring. */
export function musicBox(engine: AudioEngine, out: AudioNode, note: number, at: number, peak: number): void {
  const f = midi(note);
  const p = peak * human();
  tone(engine, out, at, { frequency: f, attack: 0.002, decay: 1.3, peak: p });
  tone(engine, out, at, { frequency: f * 4.02, attack: 0.001, decay: 0.18, peak: p * 0.18 });
  tone(engine, out, at, { type: "triangle", frequency: f * 2, attack: 0.002, decay: 0.3, peak: p * 0.25 });
}

/** A whistled note: a sine that scoops up into pitch and grows a slow vibrato. */
export function whistle(engine: AudioEngine, out: AudioNode, note: number, at: number, length: number, peak: number): void {
  const { ctx } = engine;
  const f = midi(note);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(f * 0.97, at);
  osc.frequency.exponentialRampToValueAtTime(f, at + 0.05);
  const lfo = ctx.createOscillator();
  const depth = ctx.createGain();
  lfo.frequency.value = 5.2;
  depth.gain.setValueAtTime(0, at);
  depth.gain.linearRampToValueAtTime(f * 0.01, at + Math.min(0.4, length));
  lfo.connect(depth).connect(osc.frequency);
  const p = peak * human(0.1);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(p, at + 0.03);
  gain.gain.setValueAtTime(p * 0.85, at + Math.max(0.05, length * 0.8));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length + 0.12);
  osc.connect(gain).connect(out);
  // A breath of air on the front of each note.
  noise(engine, out, at, { filter: "bandpass", frequency: f * 2, q: 3, attack: 0.01, decay: 0.06, peak: p * 0.12 });
  for (const node of [osc, lfo]) {
    node.start(at);
    node.stop(at + length + 0.2);
  }
  osc.onended = () => gain.disconnect();
}

/** A ukulele strum: the chord's notes rolled quickly low to high, each a plucked triangle. */
export function strum(engine: AudioEngine, out: AudioNode, notes: readonly number[], at: number, peak: number): void {
  const p = peak * human();
  notes.forEach((note, i) => {
    const t = at + i * 0.014;
    tone(engine, out, t, { type: "triangle", frequency: midi(note), attack: 0.003, decay: 0.28, peak: p });
    tone(engine, out, t, { frequency: midi(note) * 2, attack: 0.002, decay: 0.08, peak: p * 0.3 });
  });
}

/** An upright bass: a round low note with the slap of the string on the board. */
export function upright(engine: AudioEngine, out: AudioNode, note: number, at: number, length: number, peak = 0.2): void {
  const p = peak * human(0.1);
  tone(engine, out, at, { type: "triangle", frequency: midi(note), attack: 0.006, decay: length, peak: p });
  tone(engine, out, at, { frequency: midi(note), attack: 0.006, decay: length * 1.2, peak: p * 0.8 });
  noise(engine, out, at, { filter: "lowpass", frequency: 500, decay: 0.03, peak: p * 0.35 });
}

/** A soft reed organ chord that swells in, the calliope's gentle cousin. */
export function organ(engine: AudioEngine, out: AudioNode, notes: readonly number[], at: number, length: number, peak: number): void {
  const { ctx } = engine;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak, at + length * 0.3);
  gain.gain.setValueAtTime(peak, at + length * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length + 0.2);
  gain.connect(out);
  for (const note of notes) {
    for (const [type, detune] of [["triangle", -6], ["sine", 6]] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = midi(note);
      osc.detune.value = detune;
      osc.connect(gain);
      osc.start(at);
      osc.stop(at + length + 0.3);
    }
  }
  setTimeout(() => gain.disconnect(), (at - engine.now + length + 1) * 1000);
}

/** The brushed kit: a padded kick, a brush sweep, a rim click and a shaker. */
export const kit = {
  kick(engine: AudioEngine, out: AudioNode, at: number, peak = 0.3): void {
    tone(engine, out, at, { frequency: 95, glideTo: 48, decay: 0.2, peak: peak * human() });
  },
  brush(engine: AudioEngine, out: AudioNode, at: number, peak = 0.05): void {
    noise(engine, out, at, { filter: "bandpass", frequency: 2600, q: 0.6, attack: 0.012, decay: 0.12, peak: peak * human(0.3) });
  },
  rim(engine: AudioEngine, out: AudioNode, at: number, peak = 0.06): void {
    noise(engine, out, at, { filter: "bandpass", frequency: 1700, q: 5, decay: 0.03, peak: peak * human() });
    tone(engine, out, at, { type: "triangle", frequency: 820, decay: 0.03, peak: peak * 0.5 });
  },
  shaker(engine: AudioEngine, out: AudioNode, at: number, peak = 0.025): void {
    noise(engine, out, at, { filter: "highpass", frequency: 6500, attack: 0.008, decay: 0.045, peak: peak * human(0.4) });
  },
};
