import { startShot } from "../engine/kick";
import { createMatch, stepMatch, type Entrant } from "../engine/match";
import { startPlay } from "../engine/rules";
import { STEP } from "../engine/tuning";
import type { Command, MatchState } from "../engine/types";

/** The same sides as the trailer, with the Striker on a phone so the film can steer him. */
const LINEUP: Entrant[] = [
  { team: 0, build: "striker", seat: 0 },
  { team: 0, build: "playmaker", seat: null },
  { team: 0, build: "defender", seat: null },
  { team: 1, build: "keeper", seat: null },
  { team: 1, build: "allrounder", seat: null },
  { team: 1, build: "winger", seat: null },
];

const STRIKER = 0;

/** Where the Striker starts his run, and the way he runs: at the far goal, a little across the pitch. */
export const ICON_RUN = { from: { x: 1, z: -6 }, dir: { x: 0.963, z: 0.271 } };

/** Seconds into the run he sets himself to shoot. */
const SHOOT_AT = 1.2;

/** Everyone else stands well clear of the run, so the Striker is alone in the frame. */
const CLEAR: readonly [number, number, number][] = [
  [1, -12, 8],
  [2, -16, -2],
  [3, 25, 0],
  [4, 4, 12],
  [5, -6, 12],
];

/**
 * The icon's film, made like a cover shot: the Striker alone, sprinting
 * at goal with the ball at his boot, then winding up to shoot. Computer
 * players are set to training, so they stand still. Returns the match
 * held `at` seconds into the run.
 */
export function iconMatch(at: number): MatchState {
  const state = createMatch(LINEUP, { seed: 51, replays: false, level: "training", rig: () => "goal" });
  startPlay(state);
  const striker = state.athletes[STRIKER]!;
  striker.pos = { ...ICON_RUN.from };
  striker.facing = Math.atan2(ICON_RUN.dir.z, ICON_RUN.dir.x);
  for (const [id, x, z] of CLEAR) state.athletes[id]!.pos = { x, z };
  // Already in full stride, the ball rolling at his boot: bodies take a second or two to get going.
  const pace = 7;
  striker.vel = { x: ICON_RUN.dir.x * pace, z: ICON_RUN.dir.z * pace };
  state.ball.pos = { x: ICON_RUN.from.x + ICON_RUN.dir.x * 0.5, y: 0.11, z: ICON_RUN.from.z + ICON_RUN.dir.z * 0.5 };
  state.ball.vel = { x: striker.vel.x, y: 0, z: striker.vel.z };
  const run: Command = { move: ICON_RUN.dir };
  const commands = new Map([[STRIKER, run]]);
  let shot = false;
  for (let t = 0; t < at - 1e-6; t += STEP) {
    if (!shot && t >= SHOOT_AT) {
      shot = true;
      startShot(state, striker, 0.9);
    }
    stepMatch(state, commands, STEP);
  }
  // The referee follows the play; he is sent behind the camera so the Striker stands alone.
  state.referee.pos = { x: 16, z: 10 };
  state.referee.vel = { x: 0, z: 0 };
  return state;
}
