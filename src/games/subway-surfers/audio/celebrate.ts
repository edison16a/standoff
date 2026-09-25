import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "./voices";

/**
 * The end of the run: a funky horn fanfare in the run tune's key, turned
 * major for the win, then a crowd on the platform cheering and clapping.
 * Everything is random a little, so no two results sound the same.
 */

/** A soft brass section: detuned saws behind a low pass that opens as the note speaks. */
function horn(engine: AudioEngine, out: AudioNode, at: number, note: number, length: number, peak: number): void {
  const { ctx } = engine;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(600, at);
  filter.frequency.linearRampToValueAtTime(2600, at + 0.06);
  filter.frequency.exponentialRampToValueAtTime(900, at + length);
  filter.connect(out);
  for (const detune of [-7, 7]) tone(engine, filter, at, { type: "sawtooth", frequency: midi(note), detune, attack: 0.03, decay: length, peak });
  setTimeout(() => filter.disconnect(), (at - engine.now + length + 0.5) * 1000);
}

/** Pickup, stab, stab, then a held G major ninth with a boom and sparkles. */
export function fanfare(engine: AudioEngine, out: AudioNode, big: boolean): void {
  const at = engine.now + 0.05;
  const beat = 0.15;
  [[62, 67], [67, 71], [69, 74], [71, 74]].forEach(([low, high], i) => {
    horn(engine, out, at + i * beat, low!, 0.16, 0.05);
    horn(engine, out, at + i * beat, high!, 0.16, 0.05);
  });
  const held = at + 4 * beat + 0.08;
  for (const note of big ? [67, 71, 74, 78, 81] : [67, 71, 74, 78]) horn(engine, out, held, note, 1.8, 0.035);
  tone(engine, out, held, { frequency: midi(43), attack: 0.01, decay: 1.6, peak: 0.45 });
  tone(engine, out, held, { frequency: 140, glideTo: 45, decay: 0.3, peak: 0.4 });
  noise(engine, out, held, { filter: "highpass", frequency: 6500, decay: 1.4, peak: 0.08 });
  [86, 91, 95, 98, 103].forEach((note, i) => {
    tone(engine, out, held + 0.1 + i * 0.07, { frequency: midi(note) * (1 + (Math.random() - 0.5) * 0.01), decay: 0.5, peak: 0.05 });
  });
}

/** A handful of people on the platform, each a buzzy voice through an "ah" or "ey" shape. */
function shout(engine: AudioEngine, out: AudioNode, at: number, length: number): void {
  const { ctx } = engine;
  const voice = ctx.createOscillator();
  voice.type = "sawtooth";
  const base = Math.random() < 0.5 ? 140 + Math.random() * 80 : 240 + Math.random() * 140;
  voice.frequency.setValueAtTime(base, at);
  voice.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.3), at + 0.2);
  voice.frequency.exponentialRampToValueAtTime(base * 0.85, at + length);
  const formant = ctx.createBiquadFilter();
  formant.type = "bandpass";
  formant.frequency.value = 700 + Math.random() * 600;
  formant.Q.value = 3;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(0.09 + Math.random() * 0.05, at + 0.1 + Math.random() * 0.2);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  voice.connect(formant).connect(gain).connect(out);
  voice.start(at);
  voice.stop(at + length + 0.05);
  voice.onended = () => gain.disconnect();
}

/** A cheer and applause, bigger when there is a winner or a new best. */
export function cheer(engine: AudioEngine, out: AudioNode, big: boolean): void {
  const at = engine.now + 0.4;
  const length = big ? 2.6 : 1.8;
  const voices = big ? 9 : 5;
  for (let i = 0; i < voices; i++) shout(engine, out, at + Math.random() * 0.3, length * (0.6 + Math.random() * 0.4));
  noise(engine, out, at, { filter: "bandpass", frequency: 1100, q: 0.5, attack: 0.25, decay: length, peak: big ? 0.25 : 0.16 });
  const claps = Math.round(length * (big ? 36 : 22));
  for (let i = 0; i < claps; i++) {
    // Squared, so most claps land early and the patter thins out.
    const t = at + Math.pow(Math.random(), 1.6) * length;
    const fade = 1 - (t - at) / length;
    noise(engine, out, t, { filter: "bandpass", frequency: 1200 + Math.random() * 1600, q: 1.4, attack: 0.002, decay: 0.03 + Math.random() * 0.03, peak: (0.12 + Math.random() * 0.1) * (0.3 + fade * 0.7) });
  }
}
