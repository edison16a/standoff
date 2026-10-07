import { between, type Rng } from "../rng";
import type { Family } from "../shot-calibration";
import { bankAngle } from "../shot-model";
import type { ReleaseInput } from "../shot-release";
import { RIM } from "../tuning";
import type { LayupKind } from "../types";
import type { V3 } from "../vec";
import { LAYUP_SPEC } from "./layups";

/**
 * How a layup preset throws the ball from the hand: its family (at the
 * ring, off the glass, a reverse, a high soft floater), the height of
 * its arc and its spin. "auto" goes off the glass from the wings, where
 * the glass is the easy way in, and straight at the ring from the front.
 */
export function layupInput(rng: Rng, kind: LayupKind, hand: V3, distance: number): ReleaseInput {
  const spec = LAYUP_SPEC[kind];
  const side = Math.atan2(hand.x - RIM.x, hand.z - RIM.z);
  const wing = bankAngle(side, distance);
  let family: Family;
  if (spec.family === "auto") family = rng() < 0.25 + 0.5 * wing ? "bank" : "layup";
  else if (spec.family === "bank") family = wing > 0.5 ? "bank" : "layup";
  else family = spec.family;
  const apex = (family === "floater" ? RIM.y : Math.max(hand.y, RIM.y)) + spec.apex;
  return { family, from: hand, apex, spinRate: between(rng, spec.backspin[0], spec.backspin[1]) };
}

/** How much of a defender's chance to block it this finish takes away. */
export function layupEvade(kind: LayupKind | null): number {
  return kind ? LAYUP_SPEC[kind].evade : 0;
}
