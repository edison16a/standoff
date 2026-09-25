import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise } from "@/platform/audio/voices";
import { bass, clap, hat, kick, lead, pad, pluck, snare } from "./instruments";
import { sectionAt, type Part, type Song } from "./song";

/** Where one take of a song plays into: the mixer's three inputs, through gains that can fade the take alone. */
export interface Outputs {
  dry: AudioNode;
  space: AudioNode;
  pumped: AudioNode;
  duckAt(at: number, beat: number): void;
}

const hits = (pattern: string, step: number) => pattern[step % 16] === "x";

function drums(engine: AudioEngine, mix: Outputs, song: Song, parts: ReadonlySet<Part>, inBar: number, at: number, spb: number): void {
  const { drums: d } = song;
  const half = parts.has("half");
  // Half time keeps a kick on one and a big snare on three, which lets the UFO float.
  const kickHere = half ? inBar === 0 || inBar === 10 : hits(d.kick, inBar);
  if ((parts.has("kick") || half) && kickHere) {
    kick(engine, mix.dry, at);
    mix.duckAt(at, spb);
  }
  const snareHere = half ? inBar === 8 : hits(d.snare, inBar);
  if (snareHere && parts.has("snare")) snare(engine, mix.dry, at);
  if (snareHere && parts.has("clap")) clap(engine, mix.space, at);
  if (parts.has("hat") && hits(d.hat, inBar)) hat(engine, mix.dry, at, false, inBar % 4 === 2 ? 0.07 : 0.045);
  if (parts.has("open") && inBar % 4 === 2) hat(engine, mix.dry, at, true, 0.05);
}

/** A snare roll into the next section, and a crash on its first beat. */
function transitions(engine: AudioEngine, mix: Outputs, song: Song, step: number, at: number): void {
  const beat = step / 4;
  const next = song.sections.find((s) => s.from > beat - 1e-9 && s.from - beat <= 1);
  if (next && next.from > beat && step % 16 >= 12 && next.parts.has("snare")) snare(engine, mix.dry, at, 0.08 + (step % 4) * 0.05);
  if (song.sections.some((s) => s.from === beat && s.from > 0)) {
    noise(engine, mix.space, at, { filter: "highpass", frequency: 5000, decay: 1.4, peak: 0.12 });
  }
}

/**
 * Plays whatever falls on one sixteenth of a song. `step` counts from
 * the top of the song, which is the start of the level.
 */
export function playStep(engine: AudioEngine, mix: Outputs, song: Song, step: number, at: number): void {
  const spb = 60 / song.bpm;
  const sixteenth = spb / 4;
  const beat = step / 4;
  const parts = sectionAt(song, Math.floor(beat)).parts;
  const inBar = step % 16;
  const chord = song.chords[Math.floor(step / 16) % song.chords.length]!;
  const time = at + (step % 2 === 1 ? song.swing * sixteenth : 0);

  drums(engine, mix, song, parts, inBar, time, spb);
  transitions(engine, mix, song, step, time);

  const low = song.bass[inBar % song.bass.length];
  if (parts.has("bass") && low) bass(engine, mix.dry, time, chord[0]! + low.midi, low.length * sixteenth, song.bassStyle);

  if (parts.has("pad") && inBar === 0) pad(engine, mix.pumped, at, chord.slice(1), spb * 4);

  const arp = song.arp[inBar % song.arp.length];
  if (parts.has("arp") && arp !== null && arp !== undefined) {
    const tones = chord.slice(1);
    const midi = tones[((arp % 100) - 1) % tones.length]! + 12 + (arp >= 100 ? 12 : 0);
    pluck(engine, mix.space, time, midi, 0.035, song.arpVoice);
  }

  const line = parts.has("leadB") ? song.leadB : parts.has("lead") ? song.lead : null;
  const voice = parts.has("leadB") ? song.leadBVoice : song.leadVoice;
  const hook = line?.[step % line.length];
  if (hook) lead(engine, mix.space, time, hook.midi, hook.length * sixteenth, voice);
}
