import { rimDistance } from "../engine/court";
import { pressJump } from "../engine/defend";
import type { MatchEvent } from "../engine/events";
import { Match } from "../engine/match";
import { dir2 } from "../engine/vec";
import { CAST, TRAILER_LINEUP, toward } from "./trailer-cast";

const { playmaker: PM, dunker: DUNKER, shooter: SHOOTER, lockdown: LOCKDOWN, big: BIG, allround: ALLROUND } = CAST;

/** Where the six stand as the film opens: the Playmaker at the top with the ball, the Big Man waiting in the paint. */
const OPENING: readonly [number, number, number][] = [
  [PM, 0.9, 10.4],
  [DUNKER, -5.4, 5.6],
  [SHOOTER, 6.3, 1.3],
  [LOCKDOWN, 0.15, 10.1],
  [BIG, 0.4, 3.4],
  [ALLROUND, -3.9, 6.6],
];

/** How near the rim the Playmaker is when the Big Man leaves his feet for the layup, and the lob goes up over him. */
const RISE_AT = 3.9;
const LOB_AFTER = 0.14;
/** How near the rim the drive is when the Dunker sets off from the wing on his cut, so he arrives under the lob. */
const CUT_AT = 7.6;

type Stage = "drive" | "rise" | "lob" | "slam";

/**
 * The trailer's opening play, all of it live in the engine. The
 * Playmaker drives hard down the lane for a layup with the Lockdown
 * defender on his hip; the Big Man steps up and rises to block it; at
 * the last moment the Playmaker lobs it over him to the Dunker cutting
 * from the left wing, who catches it on the way up and throws down a two
 * hand poster dunk on the Big Man, putting him on the floor. Outcomes
 * are set ahead so every capture films the same play.
 */
export class PosterFilm {
  readonly match: Match;
  private stage: Stage = "drive";
  private at = 0;
  private cutting = false;

  constructor() {
    this.match = new Match({ seed: 11, firstOffence: 0, entries: [...TRAILER_LINEUP] });
    const m = this.match;
    m.checkBeat = false;
    m.phase = "live";
    m.phaseT = 0;
    for (const [id, x, z] of OPENING) Object.assign(m.athletes[id]!, { x, z, yaw: Math.PI, auto: false });
    m.athletes[BIG]!.yaw = 0;
    m.athletes[LOCKDOWN]!.yaw = 0;
    m.ball.holder = PM;
    m.brains.reset();
  }

  steer(t: number): void {
    const m = this.match;
    const [pm, dunker, big, lock, help] = [m.athletes[PM]!, m.athletes[DUNKER]!, m.athletes[BIG]!, m.athletes[LOCKDOWN]!, m.athletes[ALLROUND]!];
    for (const a of m.athletes) a.stealCd = Math.max(a.stealCd, 0.5);
    // The Lockdown defender stays on the Playmaker's left hip all the way down the lane.
    lock.move = toward(lock, { x: pm.x - 0.65, z: pm.z + 0.2 }, 1, 0.2);
    // The All Rounder loses his man, watching the ball, and sags into the lane too late.
    help.move = t > 0.6 ? toward(help, { x: -1.7, z: 6.1 }, 0.45) : { x: 0, z: 0 };
    if (rimDistance(pm) < CUT_AT) this.cutting = true;
    dunker.move = this.cutting && dunker.action.kind !== "drive" ? toward(dunker, { x: -0.35, z: 1.7 }, 1) : { x: 0, z: 0 };
    switch (this.stage) {
      case "drive":
        pm.move = toward(pm, { x: 0.3, z: 2.6 }, 1);
        // The Big Man steps up to meet the drive.
        big.move = toward(big, { x: 0.35, z: 3.6 }, 0.35);
        if (rimDistance(pm) < RISE_AT) {
          big.move = { x: 0, z: 0 };
          pressJump(m, big);
          this.next("rise", t);
        }
        break;
      case "rise":
        pm.move = toward(pm, { x: 0.3, z: 2.6 }, 0.8);
        if (t - this.at >= LOB_AFTER) {
          m.forced = "swish";
          m.forcedFinish = { dunk: "poster" };
          m.press(PM, "pass", dir2(pm, dunker));
          this.next("lob", t);
        }
        break;
      case "lob":
        // He pulls up out of the way as the lob goes over.
        pm.move = toward(pm, { x: 1.9, z: 3.4 }, 0.5);
        if (big.action.kind === "none") big.move = toward(big, { x: dunker.x + 0.5, z: dunker.z - 0.2 }, 0.7, 0.9);
        if (dunker.action.kind === "drive") this.next("slam", t);
        break;
      case "slam":
        pm.move = { x: 0, z: 0 };
        big.move = big.action.kind === "none" ? toward(big, { x: dunker.x + 0.4, z: dunker.z - 0.3 }, 0.6, 0.8) : { x: 0, z: 0 };
        break;
    }
  }

  private next(stage: Stage, t: number): void {
    this.stage = stage;
    this.at = t;
  }

  slowFor(e: MatchEvent): { scale: number; seconds: number } | null {
    void e;
    return null;
  }
}
