import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import type { BuildId } from "../builds";
import type { Ball, TeamId } from "./types";

/** One player in a game, as the lobby hands them over. */
export interface Entry {
  team: TeamId;
  build: BuildId;
  /** The phone playing this athlete, or null for a computer player. */
  seat: number | null;
  /** The role the host gave them: 0 Guard, 1 Wing, 2 Big. In entry order when left out. */
  slot?: number;
}

export interface MatchOptions {
  entries: readonly Entry[];
  seed?: number;
  /** Who has the ball first. Drawn from the seed when left out. */
  firstOffence?: TeamId;
  /** Points to win. */
  target?: number;
  /** How good the computer players are. Easy unless the lobby says otherwise. */
  botLevel?: BotLevel;
}

/** The ball before the first check: at the top, still, with no spin. */
export function restingBall(): Ball {
  return {
    pos: { x: 0, y: 1, z: 9 },
    vel: { x: 0, y: 0, z: 0 },
    mode: "held",
    holder: null,
    flight: null,
    flightT: 0,
    flightSeg: -1,
    flightKind: null,
    passTo: null,
    passRolled: [],
    shot: null,
    lastTouch: null,
    spin: 0,
    w: { x: 0, y: 0, z: 0 },
    rimCd: 0,
  };
}
