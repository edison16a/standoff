import { moveOf, type MoveKey } from "../moves";
import { mainSurface, over } from "../stages";
import type { Fighter, MatchState } from "../types";

/** Roughly how far a move's lunges carry the fighter, in metres toward where they face. */
export function lungeDistance(key: MoveKey, f: Fighter): number {
  const motion = moveOf(f.character, key).motion ?? [];
  let metres = 0;
  motion.forEach((m, i) => {
    const until = motion[i + 1]?.frame ?? m.frame + 12;
    metres += ((m.vx ?? 0) * (until - m.frame)) / 60;
  });
  return metres;
}

/** Whether the move leaves the fighter over the main platform, so a dash never carries a bot off the edge. */
export function staysOn(state: MatchState, f: Fighter, key: MoveKey, facing: number): boolean {
  return over(mainSurface(state.stage), f.pos.x + facing * (lungeDistance(key, f) + 1));
}
