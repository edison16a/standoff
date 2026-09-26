import { canCancel, connected } from "../flow";
import { isHeavyKey, type MoveKey } from "../moves";
import type { Rng } from "../rng";
import type { Command, Fighter, MatchState } from "../types";
import type { Skill } from "./brain";
import { lungeDistance, staysOn } from "./edge";
import { pressFor, scoreMove, wouldHit } from "./pick-move";

/**
 * Following a hit with the next link of a string, the way a player
 * mashes into a combo. Once per landed swing the bot decides whether to
 * chain, sharper bots more often, then presses the best move the cancel
 * rules allow that would reach the target from here.
 */

const LIGHTS: MoveKey[] = ["jab", "side", "up", "down"];
const AIR_LIGHTS: MoveKey[] = ["air", "airUp", "airDown"];
const HEAVIES: MoveKey[] = ["heavy", "heavySide", "heavyDown"];

export function chainPress(state: MatchState, f: Fighter, t: Fighter, skill: Skill, rng: Rng): Command | null {
  const brain = f.brain!;
  if (!connected(f) || brain.chained === f.swing) return null;
  brain.chained = f.swing;
  if (!rng.chance(skill.judgement)) return null;
  const dir = t.pos.x >= f.pos.x ? 1 : -1;
  const grounded = f.ground !== null;
  let best: { key: MoveKey; score: number } | null = null;
  for (const key of [...(grounded ? LIGHTS : AIR_LIGHTS), ...HEAVIES]) {
    if (!canCancel(f, key)) continue;
    const turns = grounded && (key === "side" || key === "heavySide");
    const facing = turns ? dir : f.facing;
    if (!wouldHit(f, t, key, facing)) continue;
    // A dashing finisher at the edge would carry the bot off after the target.
    if (lungeDistance(key, f) > 0 && !staysOn(state, f, key, facing)) continue;
    // Heavier finishers pay off near KO range; before that, keep the string going.
    const finish = isHeavyKey(key) && t.percent > 60 ? 8 : 0;
    const score = scoreMove(f, t, key) + finish + rng.next() * (1 - skill.judgement) * 20;
    if (!best || score > best.score) best = { key, score };
  }
  return best ? pressFor(best.key, dir) : null;
}
