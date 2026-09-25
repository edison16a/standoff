import { CHARACTERS } from "../../roster";
import { chargedHit } from "../attack";
import { launchSpeed } from "../knockback";
import { CHARGE_KEYS, moveOf, type ChargeKey } from "../moves";
import type { Rng } from "../rng";
import { CHARGE } from "../tuning";
import { mainSurface, over } from "../stages";
import type { ChargeButton, Fighter, MatchState } from "../types";
import type { Skill } from "./brain";
import { wouldHit } from "./pick-move";

/** What a bot winds up: which button, the stick at the press, how many frames to charge, and which way to face on release. */
export interface ChargePlan {
  key: ChargeKey;
  button: ChargeButton;
  y: number;
  frames: number;
  face: number;
}

/** The press that winds up each charged move. Side charges start neutral, so the fighter does not run while the hold is timed. */
const PRESS: Record<ChargeKey, { button: ChargeButton; y: number }> = {
  holdSide: { button: "light", y: 0 },
  holdUp: { button: "light", y: 0.5 },
  holdDown: { button: "light", y: -1 },
  holdHeavy: { button: "heavy", y: 0 },
  holdHeavyDown: { button: "heavy", y: -1 },
};

/** Roughly how far a move's lunges carry the fighter, in metres toward where they face. */
function lungeDistance(key: ChargeKey, f: Fighter): number {
  const motion = moveOf(f.character, key).motion ?? [];
  let metres = 0;
  motion.forEach((m, i) => {
    const until = motion[i + 1]?.frame ?? m.frame + 12;
    metres += ((m.vx ?? 0) * (until - m.frame)) / 60;
  });
  return metres;
}

/** Whether the target will still be there after a wind up: stunned, dizzy, or busy in a long move of their own. */
function open(t: Fighter): boolean {
  if (t.action === "dizzy" || t.action === "charge") return true;
  if (t.action === "hurt") return t.hitstun > CHARGE.threshold;
  if (t.action === "attack" && t.move) return moveOf(t.character, t.move).frames - t.frame > CHARGE.threshold + 10;
  return false;
}

/**
 * A charged move worth winding up now, or null. Bots charge when the
 * target is open, and now and then on a hunch, sharper bots more often.
 * The pick is the hardest launch among the moves that would reach.
 */
export function planCharge(state: MatchState, f: Fighter, t: Fighter, skill: Skill, rng: Rng): ChargePlan | null {
  if (f.ground === null || !(open(t) || rng.chance(skill.charge))) return null;
  const dir = t.pos.x >= f.pos.x ? 1 : -1;
  const level = Math.min(1, skill.judgement * rng.next() * 1.2);
  const weight = CHARACTERS[t.character].physique.weight;
  const main = mainSurface(state.stage);
  let best: ChargePlan | null = null;
  let bestScore = 0;
  for (const key of CHARGE_KEYS) {
    const turns = key === "holdSide" || key === "holdHeavy";
    const facing = turns ? dir : f.facing;
    if (!wouldHit(f, t, key, facing)) continue;
    // A long dash near the edge would carry the fighter off the stage.
    if (!over(main, f.pos.x + facing * (lungeDistance(key, f) + 1))) continue;
    const move = moveOf(f.character, key);
    const hit = move.hitboxes[move.hitboxes.length - 1] ?? move.projectiles?.[0];
    if (!hit) continue;
    const strong = chargedHit(hit, level);
    const score = strong.damage + launchSpeed(strong, t.percent + strong.damage, weight) * 0.5 + rng.next() * (1 - skill.judgement) * 10;
    if (score > bestScore) {
      bestScore = score;
      best = { key, ...PRESS[key], frames: Math.round(level * CHARGE.full), face: turns ? dir : 0 };
    }
  }
  return best;
}
