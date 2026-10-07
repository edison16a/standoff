import { pressJump } from "../engine/defend";
import type { MatchEvent } from "../engine/events";
import { Match } from "../engine/match";
import { basketDir } from "../engine/move-pick";
import { GREEN_MS } from "../engine/shot-model";
import { CAST, TRAILER_LINEUP, toward } from "./trailer-cast";

const { playmaker: PM, dunker: DUNKER, shooter: SHOOTER, lockdown: LOCKDOWN, big: BIG, allround: ALLROUND } = CAST;

/** Where the six stand: the Shooter on the right of the top with the ball, the Lockdown defender on him, the All Rounder in the lane. */
const OPENING: readonly [number, number, number][] = [
  [PM, -5.6, 6.4],
  [DUNKER, -6.4, 1.6],
  [SHOOTER, 2.7, 9.6],
  [LOCKDOWN, 2.0, 6.25],
  [BIG, -1.3, 2.4],
  [ALLROUND, 0.7, 5.9],
];

/** How near the Lockdown defender the jab gets before the stepback goes: far enough that the move never beats him (see `nearestDefender`), so he is on his feet to fly at the shot. */
const STEP_GAP = 2.05;
/** The gold: let go exactly on the middle of the green. */
const GOLD_MS = GREEN_MS;
/** How long before the release each defender leaves his feet, so both are near the top of the jump as the ball goes over. */
const LEAP_LOCKDOWN = 0.3;
const LEAP_HELP = 0.36;

/** The match's seed: one on which the stepback leaves the Lockdown defender on his feet to contest. */
const SEED = 18;

type Stage = "jab" | "step" | "shot" | "done";

/**
 * The trailer's second play, live in the engine. The Shooter, the small
 * one, jabs at the Lockdown defender on a hard dribble, hits a stepback
 * behind the arc and rises. The Lockdown defender closes out and the All
 * Rounder flies out of the lane, and both leap at it with everything;
 * he lets it go on the gold, and it swishes. The ending is set ahead, so
 * every capture films the same shot.
 */
export class StepbackFilm {
  readonly match: Match;
  private stage: Stage = "jab";
  private shotAt = -1;
  private readonly leapt = new Set<number>();

  constructor(seed = SEED) {
    this.match = new Match({ seed, firstOffence: 0, entries: [...TRAILER_LINEUP] });
    const m = this.match;
    m.checkBeat = false;
    m.phase = "live";
    m.phaseT = 0;
    for (const [id, x, z] of OPENING) Object.assign(m.athletes[id]!, { x, z, yaw: Math.PI, auto: false });
    for (const id of [LOCKDOWN, BIG, ALLROUND]) m.athletes[id]!.yaw = 0;
    m.ball.holder = SHOOTER;
    m.brains.reset();
  }

  steer(t: number): void {
    const m = this.match;
    const [s, lock, help] = [m.athletes[SHOOTER]!, m.athletes[LOCKDOWN]!, m.athletes[ALLROUND]!];
    for (const a of m.athletes) a.stealCd = Math.max(a.stealCd, 0.5);
    const act = s.action;
    switch (this.stage) {
      case "jab": {
        // A hard dribble at him, the Lockdown defender giving ground in front.
        s.move = t > 0.2 ? toward(s, { x: 1.9, z: 7.9 }, 0.75) : { x: 0, z: 0 };
        // The Lockdown defender sits down in his stance, playing off to stop the drive.
        lock.move = { x: 0, z: 0 };
        // The All Rounder shades over from the lane as the dribble comes at him.
        help.move = t > 0.5 ? toward(help, { x: 0.75, z: 6.75 }, 0.4) : { x: 0, z: 0 };
        if (t > 0.5 && Math.hypot(s.x - lock.x, s.z - lock.z) < STEP_GAP) {
          s.move = { x: 0, z: 0 };
          s.moveHeat = 0;
          const f = basketDir(s);
          m.press(SHOOTER, "defend", { x: -f.x, z: -f.z });
          m.forced = "swish";
          this.stage = "step";
        }
        break;
      }
      case "step":
        // Played off to stop the drive, he is out of the stepback's reach (a move only beats a man within 2.2 m), then flies out at the shot.
        lock.move = act.kind === "move" && act.t < 0.22 ? { x: 0, z: 0 } : toward(lock, { x: s.x - 0.2, z: s.z - 0.95 }, 1, 0.1);
        help.move = act.kind === "move" && act.t < 0.22 ? { x: 0, z: 0 } : toward(help, { x: s.x - 1.35, z: s.z - 1.2 }, 1, 0.1);
        // Shoot pressed early in the move waits on it and comes straight out of the stepback.
        if (act.kind === "move" && act.t > 0.08) m.press(SHOOTER, "shoot");
        if (act.kind === "shoot") {
          this.shotAt = t - act.t;
          this.stage = "shot";
        }
        break;
      case "shot": {
        const into = t - this.shotAt;
        const release = GOLD_MS / 1000;
        // Both close out on him, then leap.
        if (lock.action.kind === "none") lock.move = toward(lock, { x: s.x - 0.2, z: s.z - 0.95 }, 1, 0.1);
        if (help.action.kind === "none") help.move = toward(help, { x: s.x - 1.35, z: s.z - 1.2 }, 1, 0.1);
        if (into >= release - LEAP_LOCKDOWN) this.leap(LOCKDOWN);
        if (into >= release - LEAP_HELP) this.leap(ALLROUND);
        if (act.kind === "shoot" && act.t * 1000 >= GOLD_MS) {
          m.release(SHOOTER, GOLD_MS);
          this.stage = "done";
        }
        break;
      }
      case "done":
        // Down again, the Lockdown defender drifts off to the Shooter's right to watch it, out of his line of sight to the rim.
        if (lock.action.kind !== "block") lock.move = toward(lock, { x: s.x + 1.1, z: s.z - 1.1 }, 0.45);
        if (help.action.kind !== "block") help.move = { x: 0, z: 0 };
        break;
    }
  }

  /** Each defender leaves his feet once. */
  private leap(id: number): void {
    if (this.leapt.has(id)) return;
    this.leapt.add(id);
    pressJump(this.match, this.match.athletes[id]!);
  }

  slowFor(e: MatchEvent): { scale: number; seconds: number } | null {
    void e;
    return null;
  }
}
