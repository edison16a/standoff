import type { Rng } from "../rng";
import type { Family } from "../shot-calibration";
import { isGreen, type Grade, type ShotKind } from "../shot-model";
import { clamp } from "../vec";
import { MAKE_PRESETS, MISS_PRESETS, type MakePreset, type MissPreset, type ShotPreset } from "./presets";

/**
 * The outcome picker: at release, before the ball flies, it decides how
 * the shot ends. Whether it drops comes from the make chance (the meter,
 * the contest, the distance and the rating, see `shot-model.ts`); how it
 * drops or misses comes from the same things. A clean green jumper is
 * mostly a swish, a soft close layup can roll round the ring, a late
 * release clangs long off the back iron, an early one catches the front,
 * and a heavy hand in the face can send one wide of everything.
 */

export interface ShotQuality {
  kind: ShotKind;
  grade: Grade;
  family: Family;
  /** The make chance from the shot model, fouls already counted. */
  chance: number;
  distance: number;
  contest: number;
  /** How suited the spot is to the glass, 0 to 1 (`bankAngle`). */
  bankable: number;
}

export interface Pick {
  preset: ShotPreset;
  /** -1 for an early release, which misses short, to 1 for a late one, which misses long. */
  lean: number;
}

const off = (g: Grade) => g === "early" || g === "late";

/** The relative weight of each way in, for a shot that drops. */
export function makeWeights(q: ShotQuality): Record<MakePreset, number> {
  const quality = clamp((q.chance - 0.25) / 0.7, 0, 1);
  const close = clamp(1 - q.distance / 3, 0, 1);
  const glass = q.family === "bank" || q.family === "bankJumper";
  const finish = q.kind === "layup";
  const soft = finish || q.family === "floater";
  const swish = finish ? 0.2 + 0.2 * quality : 0.35 + 0.45 * quality + (isGreen(q.grade) ? 0.2 : 0);
  return {
    swish: glass ? 0.05 : swish,
    // Off the wings the glass is a real way in: layups, floaters and the mid range bank.
    bank: glass ? 1.4 : soft ? 0.3 * q.bankable : q.kind === "jumper" && q.distance < 6.2 ? 0.15 * q.bankable : 0,
    frontRimIn: 0.09 + (q.grade === "early" ? 0.12 : 0) + (1 - quality) * 0.05,
    backRimIn: 0.09 + (q.grade === "late" ? 0.12 : 0) + (1 - quality) * 0.05,
    // A long ball comes in too fast to rattle about much.
    rattleIn: (0.035 + q.contest * 0.08 + (1 - quality) * 0.06) * clamp((7.5 - q.distance) / 4, 0.15, 1),
    // The toilet bowl is a soft touch at the rim: mostly close layups.
    rollIn: soft ? 0.1 + 0.1 * close : 0.015 + 0.03 * (1 - quality),
  };
}

/** The relative weight of each way out, for a shot that misses. */
export function missWeights(q: ShotQuality): Record<MissPreset, number> {
  const glass = q.family === "bank" || q.family === "bankJumper";
  const finish = q.kind === "layup";
  const soft = finish || q.family === "floater";
  const deep = clamp((q.distance - 6) / 2, 0, 1);
  return {
    rimOut: 0.55,
    // A flat late jumper comes hard off the back and long; a layup never has the speed, a free throw seldom.
    backIron: finish ? 0 : q.kind === "free" ? 0.03 + (q.grade === "late" ? 0.1 : 0) : 0.07 + (q.grade === "late" ? 0.3 : 0) + deep * 0.12,
    rollOut: soft ? 0.25 : 0.05,
    glassOut: glass ? 0.35 : finish ? 0.08 : 0.02 * q.bankable,
    // Rare, as in a real game: a hand in the face, a deep heave or a wild release.
    airball: finish ? q.contest * 0.03 : q.kind === "free" ? 0.004 : 0.006 + q.contest * q.contest * 0.05 + deep * 0.02 + (off(q.grade) ? 0.015 : 0),
  };
}

function draw<K extends string>(rng: Rng, keys: readonly K[], w: Record<K, number>): K {
  let total = 0;
  for (const k of keys) total += Math.max(0, w[k]);
  let x = rng() * total;
  for (const k of keys) {
    x -= Math.max(0, w[k]);
    if (x < 0) return k;
  }
  return keys[0]!;
}

/** Picks the ending. Gold is always a swish, whatever the defence did. */
export function pickPreset(rng: Rng, q: ShotQuality): Pick {
  const lean = q.grade === "early" ? -1 : q.grade === "late" ? 1 : 0;
  if (q.grade === "gold") return { preset: "swish", lean: 0 };
  const made = rng() < q.chance;
  const preset = made ? draw(rng, MAKE_PRESETS, makeWeights(q)) : draw(rng, MISS_PRESETS, missWeights(q));
  return { preset, lean };
}
