import { mainSurface, over } from "../stages";
import type { Command, Fighter, MatchState } from "../types";
import { SKILLS } from "./brain";

/**
 * Getting back to the stage after being knocked off: drift toward the
 * main platform, save the double jump until falling, then use the up
 * recovery move if still short. Easy bots sometimes fumble it.
 */

export function isOffstage(state: MatchState, f: Fighter): boolean {
  if (f.ground !== null) return false;
  const main = mainSurface(state.stage);
  return !over(main, f.pos.x) || f.pos.y < main.top - 0.1;
}

export function recover(state: MatchState, f: Fighter): Command {
  const brain = f.brain!;
  const main = mainSurface(state.stage);
  if (brain.offstage === "none") brain.offstage = state.rng.chance(SKILLS[brain.difficulty].recovery) ? "good" : "poor";
  const side = f.pos.x >= 0 ? 1 : -1;
  // Below the top, stay just outside the edge while rising, or the block is in the way.
  const below = f.pos.y < main.top - 0.2;
  const edge = side > 0 ? main.x2 : main.x1;
  const goalX = below ? edge + side * 0.7 : edge - side * 1.2;
  const dx = goalX - f.pos.x;
  const x = Math.abs(dx) > 0.3 ? Math.sign(dx) : 0;
  const cmd: Command = { x, y: 0 };
  if (f.action !== "air" || f.vel.y > 1) return cmd;
  const low = f.pos.y < main.top + 1.2;
  if (!low) return cmd;
  if (f.airJumps > 0) {
    if (brain.offstage === "good" || f.pos.y < main.top - 1.5) cmd.jump = true;
    return cmd;
  }
  if (!f.recoveryUsed && (brain.offstage === "good" || f.pos.y < main.top - 3)) {
    // Up with a little lean toward the stage turns the fighter to face it.
    return { x: -side * 0.5, y: 1, heavy: true };
  }
  return cmd;
}
