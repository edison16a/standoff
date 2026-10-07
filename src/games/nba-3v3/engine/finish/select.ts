import type { DunkStyle } from "../../roster";
import { weighted, type Rng } from "../rng";
import type { LayupKind } from "../types";
import type { Approach, Threat } from "./approach";

/**
 * Picks the finish before the gather starts, from how the drive arrives
 * (`approach.ts`). Space means a dunk, every time the body can get up
 * there. A defender close by means a layup that goes round him: under
 * the rim, round his hands, away from him, or through him with the body
 * between him and the ball. A much stronger driver dunks through him
 * anyway: a poster.
 */

export interface FinishChoice {
  dunk: boolean;
  layup: LayupKind | null;
  style: DunkStyle | null;
  /** The finishing hand, 1 right, -1 left. */
  hand: 1 | -1;
  /** Which way a sidestep or a spin goes, + the driver's right: away from the defender. */
  side: 1 | -1;
}

export type Forced = { dunk: DunkStyle } | { layup: LayupKind };

/** Slower than this into the gather, the feet stop and both go up together. */
const JUMP_STOP_SPEED = 2.4;

export function selectFinish(rng: Rng, ap: Approach, forced: Forced | null = null): FinishChoice {
  const side = awayFrom(ap.threat, ap.hand);
  if (forced) return "dunk" in forced ? dunkChoice(forced.dunk, ap, side) : layupChoice(forced.layup, ap, side);
  if (ap.canDunk && ap.open) return dunkChoice(openDunk(rng, ap), ap, side);
  if (ap.canDunk && ap.threat && throughHim(ap, ap.threat)) return dunkChoice(ap.putback ? "putback" : "poster", ap, side);
  return layupChoice(pickLayup(rng, ap), ap, side);
}

/** A much stronger man goes up through a smaller one standing in front of him at the rim. */
function throughHim(ap: Approach, t: Threat): boolean {
  if (t.up || (t.spot !== "path" && t.spot !== "rim")) return false;
  return t.edge >= 3 || (t.edge >= 2 && ap.strength >= 7);
}

/** Away from the defender's side of the line, or to the natural hand with nobody beside. */
function awayFrom(t: Threat | null, hand: 1 | -1): 1 | -1 {
  if (!t || Math.abs(t.lateral) < 0.15) return hand;
  return t.lateral > 0 ? -1 : 1;
}

function dunkChoice(style: DunkStyle, ap: Approach, side: 1 | -1): FinishChoice {
  return { dunk: true, layup: null, style, hand: ap.hand, side };
}

function layupChoice(layup: LayupKind, ap: Approach, side: 1 | -1): FinishChoice {
  // The ball goes up in the hand away from the man: the far hand on a shield, the way of the step on a euro, a spin or a scoop.
  const away = layup === "shield" || layup === "euro" || layup === "spin" || layup === "scoop" || layup === "upUnder";
  return { dunk: false, layup, style: null, hand: away && ap.threat ? side : ap.hand, side };
}

/** With the rim to himself: two hands if he walked into it, the showier ones with speed, his own often. */
function openDunk(rng: Rng, ap: Approach): DunkStyle {
  if (ap.putback) return "putback";
  if (ap.alley) return "alley";
  if (ap.speed < JUMP_STOP_SPEED) return "jumpStop";
  const own = ap.signature;
  if (ap.angle === "baseline") {
    return weighted(rng, plus({ reverse: 1.4, windmill: ap.fast && ap.bounce >= 8 ? 1 : 0.15, twoHand: 0.4 }, own, 0.5));
  }
  if (ap.fast) {
    const speedy = { tomahawk: 0.6 + ap.strength * 0.08, cockback: 0.6, windmill: ap.bounce >= 8 ? 0.7 : 0.1, spin360: ap.bounce >= 9 ? 0.4 : 0 };
    return weighted(rng, plus(speedy, own, 1.2));
  }
  const settled = { twoHand: 2.2, flush: 0.7, hammer: ap.strength >= 8 ? 0.8 : 0.2, rimhang: 0.45, clutch: ap.bounce >= 7 ? 0.3 : 0.05, scoop: 0.25 };
  return weighted(rng, plus(settled, own, 1));
}

/** The weights with the build's own dunk added on top, so a signature is always in the mix. */
function plus(weights: Partial<Record<DunkStyle, number>>, own: DunkStyle, w: number): Partial<Record<DunkStyle, number>> {
  return { ...weights, [own]: (weights[own] ?? 0) + w };
}

/** A layup that beats the man where he is. */
function pickLayup(rng: Rng, ap: Approach): LayupKind {
  if (ap.putback) return "power";
  if (ap.angle === "baseline") return "reverse";
  const t = ap.threat;
  if (!t) {
    if (ap.speed < JUMP_STOP_SPEED) return "power";
    return ap.angle === "side" ? weighted<LayupKind>(rng, { glass: 1.2, finger: 1 }) : "finger";
  }
  switch (t.spot) {
    case "rim":
      // A big man waiting under it: over him early from out, off the glass from the wing, or under him once he leaves his feet.
      if (ap.distance > 2) return "teardrop";
      if (t.up) return "upUnder";
      return ap.angle === "side" ? weighted<LayupKind>(rng, { glass: 1.4, scoop: 0.8 }) : weighted<LayupKind>(rng, { scoop: 1, upUnder: 0.6, teardrop: 0.4 });
    case "path":
      // Square in the way: round him with a step across at speed, a spin or a fake up close.
      if (ap.fast) return weighted<LayupKind>(rng, { euro: 1.6, spin: 0.6, glass: ap.angle === "side" ? 0.6 : 0 });
      return t.dist < 1.3 ? weighted<LayupKind>(rng, { upUnder: 1.1, spin: 0.7, shield: 0.4 }) : weighted<LayupKind>(rng, { euro: 1, spin: 0.8 });
    case "ballSide":
      // On the ball: the body goes between him and the ball, or spins off him.
      return weighted<LayupKind>(rng, { shield: 1.4, spin: ap.fast ? 0.3 : 0.7 });
    case "offSide":
      // Coming from the other side for the block: the ball kept low and away and scooped up, or off the glass.
      return weighted<LayupKind>(rng, { scoop: 1.3, glass: ap.angle === "side" ? 0.7 : 0.2, finger: 0.3 });
    case "trail":
      // Chased down from behind: up early off the wrong foot before he can time it, or a soft roll.
      return weighted<LayupKind>(rng, { wrongFoot: 1.4, finger: 0.6 });
  }
}
