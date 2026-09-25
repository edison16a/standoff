import { CHARACTERS } from "../../roster";
import { touches } from "../combat";
import { launchSpeed } from "../knockback";
import { moveOf, type Move, type MoveKey } from "../moves";
import type { Rng } from "../rng";
import type { Command, Fighter } from "../types";

/**
 * Choosing an attack by trying each one against where the target stands
 * now: a move is a candidate if any of its boxes would touch them. Good
 * judgement picks the one that does the most, and near KO percent that
 * means the hardest launch.
 */

const GROUND: MoveKey[] = ["jab", "side", "up", "down", "heavy", "heavySide", "heavyDown"];
const AIR: MoveKey[] = ["air", "airUp", "airDown", "heavy", "heavySide", "heavyDown"];

/** The stick that makes each move, with `dir` the way to face. */
function stickFor(key: MoveKey, dir: number): { x: number; y: number } {
  if (key === "side" || key === "heavySide") return { x: dir, y: 0 };
  if (key === "up" || key === "airUp" || key === "heavyUp") return { x: 0, y: 1 };
  if (key === "down" || key === "airDown" || key === "heavyDown") return { x: 0, y: -1 };
  return { x: 0, y: 0 };
}

/** Lunges reach further than their boxes: roughly how far the motion carries during the move. */
function lungeOf(move: Move): number {
  const vx = Math.max(0, ...(move.motion ?? []).map((m) => m.vx ?? 0));
  return Math.min(3, vx * 0.15);
}

/** Whether the move would touch the target from here, facing `facing`. */
export function wouldHit(f: Fighter, t: Fighter, key: MoveKey, facing: 1 | -1): boolean {
  const move = moveOf(f.character, key);
  if (move.projectiles?.length && !move.hitboxes.length) {
    const p = move.projectiles[0]!;
    const dx = (t.pos.x - f.pos.x) * facing;
    return dx > 1.5 && dx < (p.vx * p.life) / 60 && Math.abs(t.pos.y - f.pos.y) < 1;
  }
  const lunge = lungeOf(move);
  return move.hitboxes.some((b) => {
    const reach = b.x >= 0 ? b.x + lunge : b.x;
    return touches(t, f.pos.x + reach * facing, f.pos.y + b.y, b.r + 0.15);
  });
}

function value(f: Fighter, t: Fighter, key: MoveKey): number {
  const move = moveOf(f.character, key);
  const hit = move.hitboxes[move.hitboxes.length - 1] ?? move.projectiles?.[0];
  if (!hit) return 0;
  const weight = CHARACTERS[t.character].physique.weight;
  const launch = launchSpeed(hit, t.percent + hit.damage, weight);
  // Damage for the wait: quick moves win at low percent, launches near KO range.
  const startup = Math.min(...move.hitboxes.map((b) => b.from), ...(move.projectiles ?? []).map((p) => p.frame));
  return (hit.damage * 20) / (startup + 4) + (t.percent > 80 ? launch : 0);
}

/** The attack to throw at the target now, or null if nothing reaches. */
export function pickAttack(f: Fighter, t: Fighter, judgement: number, rng: Rng): Command | null {
  const grounded = f.ground !== null;
  const dir = t.pos.x >= f.pos.x ? 1 : -1;
  const options: { key: MoveKey; score: number }[] = [];
  for (const key of grounded ? GROUND : AIR) {
    // Ground side moves turn the fighter; the rest swing the way they already face.
    const turns = grounded && (key === "side" || key === "heavySide");
    const facing = turns ? dir : f.facing;
    if (!wouldHit(f, t, key, facing)) continue;
    const noise = rng.next() * (1 - judgement) * 30;
    options.push({ key, score: value(f, t, key) + noise });
  }
  if (!options.length) return null;
  options.sort((a, b) => b.score - a.score);
  const key = options[0]!.key;
  const stick = stickFor(key, dir);
  return key.startsWith("heavy") ? { ...stick, heavy: true } : { ...stick, light: true };
}

/** Whether the ult would catch the target from here. */
export function ultReaches(f: Fighter, t: Fighter): boolean {
  const dir = t.pos.x >= f.pos.x ? 1 : -1;
  return wouldHit(f, t, "ult", dir);
}
