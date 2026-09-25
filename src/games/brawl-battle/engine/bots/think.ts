import { moveOf } from "../moves";
import { onPassThrough } from "../physics";
import { mainSurface, over } from "../stages";
import { RESPAWN } from "../tuning";
import type { Command, Fighter, MatchState } from "../types";
import { SKILLS } from "./brain";
import { planCharge } from "./charge-plan";
import { pickAttack, ultReaches } from "./pick-move";
import { isOffstage, recover } from "./recover";

/**
 * A computer fighter's controls for one step. Between decisions it keeps
 * holding the stick it chose; presses only happen on decision frames, the
 * way a person taps a button.
 */
export function botCommand(state: MatchState, f: Fighter): Command {
  const brain = f.brain;
  if (!brain) return { x: 0, y: 0 };
  if (f.action === "respawn") return leavePlatform(f);
  if (f.action === "dead" || f.action === "out") return { x: 0, y: 0 };
  if (brain.hold) return holdCharge(f);
  if (isOffstage(state, f)) return recover(state, f);
  brain.offstage = "none";
  if (brain.shieldFor > 0) {
    brain.shieldFor--;
    return { x: 0, y: -1 };
  }
  if (--brain.wait > 0) return { x: brain.x, y: 0 };
  const skill = SKILLS[brain.difficulty];
  brain.wait = skill.reaction + Math.floor(state.rng.next() * (skill.reaction / 2 + 1));
  if (state.rng.chance(skill.dither)) {
    brain.x = 0;
    return { x: 0, y: 0 };
  }
  const target = chooseTarget(state, f);
  brain.target = target?.id ?? null;
  if (!target) return { x: (brain.x = 0), y: 0 };

  if (f.ground === 0 && threatened(state, f) && state.rng.chance(skill.shield)) {
    brain.shieldFor = 10 + Math.floor(state.rng.next() * 10);
    brain.x = 0;
    return { x: 0, y: -1 };
  }
  if (f.ult >= 1 && ultReaches(f, target)) return { x: Math.sign(target.pos.x - f.pos.x), y: 0, ult: true };
  const plan = state.rng.chance(skill.aggression) ? planCharge(state, f, target, skill, state.rng) : null;
  if (plan) {
    brain.hold = { button: plan.button, frames: plan.frames, face: plan.face };
    brain.x = 0;
    return plan.button === "light" ? { x: 0, y: plan.y, light: true, lightHeld: true } : { x: 0, y: plan.y, heavy: true, heavyHeld: true };
  }
  const attack = pickAttack(f, target, skill.judgement, state.rng);
  if (attack && state.rng.chance(skill.aggression)) {
    brain.x = 0;
    return attack;
  }
  return approach(state, f, target);
}

/** Keeps a charge button down, standing still, then lets go facing the target once charged enough. */
function holdCharge(f: Fighter): Command {
  const hold = f.brain!.hold!;
  // Knocked out of the wind up, there is nothing left to release.
  const lost = f.action !== "charge" && !f.hold;
  if (lost || (f.action === "charge" && f.frame >= hold.frames)) {
    f.brain!.hold = null;
    return { x: hold.face, y: 0 };
  }
  return hold.button === "light" ? { x: 0, y: 0, lightHeld: true } : { x: 0, y: 0, heavyHeld: true };
}

/** The nearest opponent still on stage. Sharper bots lean toward whoever is closest to a KO. */
function chooseTarget(state: MatchState, f: Fighter): Fighter | null {
  const hunter = f.brain!.difficulty === "hard" ? 1 / 40 : 0;
  let best: Fighter | null = null;
  let bestScore = Infinity;
  for (const o of state.fighters) {
    if (o === f || o.action === "dead" || o.action === "out" || o.action === "respawn") continue;
    const score = Math.hypot(o.pos.x - f.pos.x, (o.pos.y - f.pos.y) * 1.5) - o.percent * hunter;
    if (score < bestScore) {
      bestScore = score;
      best = o;
    }
  }
  return best;
}

/** Someone close is winding up a swing. */
function threatened(state: MatchState, f: Fighter): boolean {
  return state.fighters.some((o) => {
    if (o === f || o.action !== "attack" || !o.move) return false;
    const first = Math.min(...moveOf(o.character, o.move).hitboxes.map((b) => b.from));
    return o.frame < first && Math.abs(o.pos.x - f.pos.x) < 2.8 && Math.abs(o.pos.y - f.pos.y) < 1.5;
  });
}

/** Walks, jumps and drops toward the target, without running off the stage after them. */
function approach(state: MatchState, f: Fighter, t: Fighter): Command {
  const brain = f.brain!;
  const main = mainSurface(state.stage);
  const dx = t.pos.x - f.pos.x;
  const dy = t.pos.y - f.pos.y;
  let x = Math.abs(dx) > 0.9 ? Math.sign(dx) : 0;
  // Wait at the edge for a target who is off the stage, rather than following them off.
  const aheadX = f.pos.x + x * 1.2;
  if (f.ground !== null && x !== 0 && !over(main, aheadX) && !over(main, t.pos.x)) x = 0;
  brain.x = x;
  const cmd: Command = { x, y: 0 };
  if (dy > 1.6 && Math.abs(dx) < 3.5) {
    if (f.ground !== null) cmd.jump = true;
    else if (f.vel.y < 0 && f.airJumps > 0) cmd.jump = true;
  } else if (dy < -1.4 && onPassThrough(f, state.stage) && Math.abs(dx) < 4) cmd.y = -1;
  return cmd;
}

/** Step off the respawn platform toward the middle once it has come down. */
function leavePlatform(f: Fighter): Command {
  if (f.frame < RESPAWN.descend + 12 + f.slot * 4) return { x: 0, y: 0 };
  return { x: f.pos.x > 0 ? -1 : 1, y: 0 };
}
