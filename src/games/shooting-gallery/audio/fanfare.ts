import type { AudioEngine } from "@/platform/audio/audio-engine";
import { brass, calliope, organ, tuba } from "./band";
import { kit } from "./kit";

/** A short flourish for the winner: a calliope run up into a held brass and organ chord, in the round's key. */
export function playFanfare(engine: AudioEngine, out: AudioNode): void {
  const at = engine.now + 0.05;
  [63, 67, 70, 75].forEach((note, i) => calliope(engine, out, at + i * 0.11, note + 12, 0.12, 0.06));
  const held = at + 0.5;
  brass(engine, out, held, [75, 79, 82, 87], 1.1, 0.08);
  organ(engine, out, held, [63, 67, 70, 75], 1.3, 0.05);
  tuba(engine, out, held, 39, 1.2, 0.22);
  kit.kick(engine, out, held, 0.3);
  kit.ride(engine, out, held, 0.04);
}
