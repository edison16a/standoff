import { blockToward } from "@/games/blade-clash/engine/bot";
import { ATTACKS, attackHold, attackLength } from "@/games/blade-clash/engine/bot-moves";
import type { Engine } from "@/games/blade-clash/engine/engine";
import { blendControl, GUARD, type SwordControl } from "@/games/blade-clash/engine/sword";
import { otherSlot, SLOTS, type PerSlot, type Slot } from "@/games/blade-clash/players";

/** One thing a fighter does in the showcase, `at` milliseconds into the fight. */
export type Beat =
  | { at: number; slot: Slot; kind: "walk"; ms: number; move: 1 | -1 }
  | { at: number; slot: Slot; kind: "attack"; attack: string }
  | { at: number; slot: Slot; kind: "block"; ms: number }
  /** Moves the blade to `control` and keeps it there, leaving an opening. */
  | { at: number; slot: Slot; kind: "hold"; ms: number; control: SwordControl };

const WIDE: SwordControl = { yaw: -1.5, pitch: 0.9, roll: 0, reach: 0.1 };
const DROPPED: SwordControl = { yaw: 1.1, pitch: -0.75, roll: 0.3, reach: 0.15 };
/** How long a hold takes to reach its place. */
const HOLD_IN_MS = 180;

/**
 * The showcase's duel, beat by beat: both step in and trade a big clash
 * each way; the Star Knight drops their blade and takes a cut to the
 * body, answers with a thrust, and after one more clash swings wide and
 * the Knight ends it with an overhead cut. Every swing and block goes
 * through the real engine, so the clashes and hits are the game's own;
 * the timings were tuned until they land (see the test beside this file).
 */
export const DUEL: readonly Beat[] = [
  { at: 0, slot: 1, kind: "walk", ms: 620, move: 1 },
  { at: 0, slot: 2, kind: "walk", ms: 560, move: 1 },
  { at: 900, slot: 1, kind: "attack", attack: "overhead" },
  { at: 1080, slot: 2, kind: "block", ms: 520 },
  { at: 2000, slot: 2, kind: "attack", attack: "cut from the right" },
  { at: 2120, slot: 1, kind: "block", ms: 480 },
  { at: 2950, slot: 2, kind: "hold", ms: 700, control: DROPPED },
  { at: 3100, slot: 1, kind: "attack", attack: "cut from the left" },
  { at: 3850, slot: 2, kind: "walk", ms: 260, move: 1 },
  { at: 4200, slot: 2, kind: "attack", attack: "thrust" },
  { at: 5300, slot: 2, kind: "attack", attack: "rising cut" },
  { at: 5420, slot: 1, kind: "block", ms: 460 },
  { at: 5900, slot: 1, kind: "walk", ms: 300, move: 1 },
  { at: 6150, slot: 2, kind: "hold", ms: 900, control: WIDE },
  { at: 6250, slot: 1, kind: "attack", attack: "overhead" },
];

/** Health at the start, so the second hit on the Star Knight ends the fight inside the clip. */
export const OPENING_HEALTH: PerSlot<number> = { 1: 3, 2: 2 };

/**
 * Plays the beats: each frame it works out every fighter's hold and
 * footwork from whichever beat they are in, and hands them to the engine
 * the same way a phone would.
 */
export class Choreography {
  private readonly holds: PerSlot<SwordControl> = { 1: { ...GUARD }, 2: { ...GUARD } };
  private readonly starts = new Map<Beat, SwordControl>();

  constructor(private readonly beats: readonly Beat[] = DUEL) {}

  /** `t` is milliseconds since the fight started. */
  drive(engine: Engine, t: number): void {
    for (const slot of SLOTS) {
      let move = 0;
      let hold = guard(slot, t);
      for (const beat of this.beats) {
        if (beat.slot !== slot || t < beat.at) continue;
        const elapsed = t - beat.at;
        if (beat.kind === "walk" && elapsed < beat.ms) move = beat.move;
        if (beat.kind === "attack") {
          const attack = ATTACKS.find((a) => a.name === beat.attack)!;
          if (elapsed >= attackLength(attack)) continue;
          if (!this.starts.has(beat)) this.starts.set(beat, { ...this.holds[slot] });
          hold = attackHold(attack, this.starts.get(beat)!, elapsed);
        }
        if (beat.kind === "block" && elapsed < beat.ms) {
          hold = blockToward(engine.fighters[slot].frame(engine.now), engine.fighters[otherSlot(slot)].frame(engine.now));
        }
        if (beat.kind === "hold" && elapsed < beat.ms) {
          if (!this.starts.has(beat)) this.starts.set(beat, { ...this.holds[slot] });
          const k = Math.min(1, elapsed / HOLD_IN_MS);
          hold = blendControl(this.starts.get(beat)!, beat.control, k * k * (3 - 2 * k));
        }
      }
      this.holds[slot] = hold;
      engine.control(slot, { ...hold, move });
    }
  }
}

/** The resting guard, breathing a little so it never looks frozen. */
function guard(slot: Slot, t: number): SwordControl {
  return { ...GUARD, yaw: GUARD.yaw + Math.sin(t / 520 + slot) * 0.06, pitch: GUARD.pitch + Math.sin(t / 730 + slot) * 0.05 };
}
