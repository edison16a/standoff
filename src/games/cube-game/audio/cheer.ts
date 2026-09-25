import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise } from "@/platform/audio/voices";

/**
 * A crowd for finishing a level: a cheer that swells and falls, and
 * applause made of many single claps that thin out as people stop. The
 * voices are detuned saws through the formants of an open "ah", so no
 * two cheers match and no sample files are needed. On the crowd bus.
 */
export function cheer(engine: AudioEngine, amount: number, delay = 0): void {
  const { ctx } = engine;
  const at = engine.now + delay;
  const seconds = 2.2;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, at);
  out.gain.linearRampToValueAtTime(0.06 * amount, at + 0.3);
  out.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  out.connect(engine.bus("crowd"));
  const filters = [700, 1150].map((frequency) => {
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 2.5;
    filter.connect(out);
    return filter;
  });
  for (let i = 0; i < 12; i++) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    const start = 290 * (0.7 + Math.random() * 0.7);
    osc.frequency.setValueAtTime(start, at);
    // Voices rise as the cheer peaks, which is what makes it sound delighted.
    osc.frequency.linearRampToValueAtTime(start * 1.3, at + seconds);
    for (const filter of filters) osc.connect(filter);
    osc.start(at + Math.random() * 0.1);
    osc.stop(at + seconds + 0.1);
    osc.onended = () => osc.disconnect();
  }
  setTimeout(() => out.disconnect(), (delay + seconds + 0.5) * 1000);
  applause(engine, amount, at);
}

function applause(engine: AudioEngine, amount: number, at: number): void {
  const seconds = 2.6;
  const claps = Math.round(60 * amount * seconds);
  for (let i = 0; i < claps; i++) {
    const t = at + seconds * Math.pow(Math.random(), 1.6);
    const fade = 1 - (t - at) / seconds;
    noise(engine, engine.bus("crowd"), t, {
      filter: "bandpass",
      frequency: 900 + Math.random() * 1700,
      q: 1.2 + Math.random(),
      attack: 0.001,
      decay: 0.025 + Math.random() * 0.04,
      peak: (0.08 + Math.random() * 0.12) * fade * amount,
    });
  }
}
