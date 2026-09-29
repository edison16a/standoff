import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import { eventsAt, LOBBY_BPM, type SongEvent } from "./lobby-song";

export { LOBBY_BPM, STEPS_PER_LOOP } from "./lobby-song";

/** Where the tune plays into: `dry` straight to the mix, `wet` through the echo as well. */
export interface TuneOutputs {
  dry: AudioNode;
  wet: AudioNode;
}

const SIXTEENTH = 60 / LOBBY_BPM / 4;

/**
 * The instruments for the lobby song (see lobby-song). All synthesised:
 * a soft electric piano, a round sine bass, a bell for the hook, and a
 * gentle kit that never gets louder than the melody.
 */
function play(engine: AudioEngine, out: TuneOutputs, event: SongEvent, at: number): void {
  const length = event.steps * SIXTEENTH;
  switch (event.voice) {
    case "kick":
      tone(engine, out.dry, at, { frequency: 130, glideTo: 44, attack: 0.002, decay: 0.3, peak: event.accent ? 0.3 : 0.22 });
      return;
    case "snap":
      noise(engine, out.wet, at, { filter: "bandpass", frequency: 1900, q: 1.3, attack: 0.002, decay: 0.1, peak: 0.13 });
      noise(engine, out.dry, at, { filter: "highpass", frequency: 5200, attack: 0.001, decay: 0.04, peak: 0.05 });
      return;
    case "shaker":
      noise(engine, out.dry, at, { filter: "highpass", frequency: 7000, attack: 0.006, decay: 0.05, peak: event.accent ? 0.045 : 0.025 });
      return;
    case "bass":
      for (const note of event.notes) {
        const peak = event.steps === 1 ? 0.13 : event.accent ? 0.3 : 0.24;
        tone(engine, out.dry, at, { frequency: midi(note), attack: 0.008, decay: length * 0.9 + 0.08, peak });
        tone(engine, out.dry, at, { type: "triangle", frequency: midi(note + 12), attack: 0.006, decay: 0.12, peak: peak * 0.18 });
      }
      return;
    case "keys":
    case "stab": {
      const held = event.voice === "keys";
      for (const note of event.notes) {
        // A sine body with a quick bright tine on top is the classic warm electric piano.
        tone(engine, out.wet, at, { frequency: midi(note), attack: 0.012, decay: held ? length * 1.6 : 0.32, peak: held ? 0.046 : 0.03 });
        tone(engine, out.wet, at, { frequency: midi(note + 12), detune: 4, attack: 0.003, decay: 0.18, peak: held ? 0.01 : 0.008 });
      }
      return;
    }
    case "bell":
      for (const note of event.notes) {
        const ring = Math.max(0.35, length * 0.95);
        tone(engine, out.wet, at, { type: "triangle", frequency: midi(note), attack: 0.004, decay: ring, peak: 0.1 });
        tone(engine, out.wet, at, { frequency: midi(note + 12), attack: 0.003, decay: 0.22, peak: 0.028 });
        tone(engine, out.wet, at, { frequency: midi(note) * 3, attack: 0.002, decay: 0.1, peak: 0.006 });
      }
      return;
  }
}

/** Plays everything that starts on this sixteenth of the loop, at audio time `at`. */
export function playLobbyStep(engine: AudioEngine, out: TuneOutputs, step: number, at: number): void {
  for (const event of eventsAt(step)) play(engine, out, event, at);
}
