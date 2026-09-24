import type { Slot } from "@/games/fencing/players";
import type { StrikeAction } from "@/games/fencing/protocol";

/**
 * The showcase bout, written out like fight choreography. Times are game
 * milliseconds after "allez". Both fencers are driven through the same
 * inputs a phone sends, so the referee judges every action for real: the
 * parries, the clash and the final touch all happen because the timing
 * works, not because the script says so.
 */

export interface MoveCue {
  slot: Slot;
  from: number;
  to: number;
  /** Footwork, -1 (retreat) to 1 (advance). */
  move: number;
}

export interface StrikeCue {
  slot: Slot;
  at: number;
  action: StrikeAction;
}

/** A little footwork on the lines before anyone commits. */
const OPENING = 900;
const at = (ms: number) => ms + OPENING;

export const MOVES: readonly MoveCue[] = [
  { slot: 1, from: 0, to: 300, move: 0.5 },
  { slot: 1, from: 300, to: 600, move: -0.5 },
  { slot: 2, from: 150, to: 450, move: -0.4 },
  { slot: 2, from: 450, to: 750, move: 0.5 },
  // Probing: red steps in, green gives ground, then presses back.
  { slot: 1, from: at(0), to: at(650), move: 0.7 },
  { slot: 2, from: at(250), to: at(700), move: -0.5 },
  { slot: 2, from: at(800), to: at(1650), move: 1 },
  // Both step back out of the parry, then red counter attacks.
  { slot: 1, from: at(1750), to: at(2000), move: -0.6 },
  { slot: 2, from: at(1750), to: at(2050), move: -0.6 },
  { slot: 1, from: at(2050), to: at(2350), move: 0.8 },
  { slot: 2, from: at(2700), to: at(3000), move: -0.6 },
  // The final exchange.
  { slot: 1, from: at(3300), to: at(3900), move: 0.9 },
  { slot: 2, from: at(3400), to: at(3700), move: 0.5 },
];

/** When red lifts the blade high for the feint. */
const FEINT = { from: at(3150), to: at(3650) };

export const STRIKES: readonly StrikeCue[] = [
  // Green attacks and red parries: sparks.
  { slot: 2, at: at(1450), action: "jab" },
  { slot: 1, at: at(1520), action: "parry" },
  // Red ripostes and green parries it in turn.
  { slot: 1, at: at(2300), action: "jab" },
  { slot: 2, at: at(2380), action: "parry" },
  // Both go at once. Red's feint goes wide, green's attack is parried: a clash. Then red lands the touch.
  { slot: 1, at: at(3500), action: "jab" },
  { slot: 2, at: at(3620), action: "jab" },
  { slot: 1, at: at(3760), action: "parry" },
  { slot: 1, at: at(4000), action: "jab" },
];

/** Blade angles over time: each fencer's point searching for an opening. */
export function aim(slot: Slot, t: number): { pitch: number; yaw: number; roll: number } {
  const phase = slot === 1 ? 0 : 1.7;
  // Red's feint: the blade swept up high, so the jab under it goes wide.
  const k = Math.min(1, Math.max(0, (t - FEINT.from) / (FEINT.to - FEINT.from)));
  const feint = slot === 1 ? Math.sin(Math.PI * k) : 0;
  return {
    pitch: 0.12 * Math.sin(t / 380 + phase) + 0.05 * Math.sin(t / 150 + phase * 2) + feint * 1.45,
    yaw: 0.14 * Math.sin(t / 520 + phase),
    roll: 0.3 * Math.sin(t / 700 + phase),
  };
}

export function moveAt(slot: Slot, t: number): number {
  return MOVES.find((cue) => cue.slot === slot && t >= cue.from && t < cue.to)?.move ?? 0;
}
