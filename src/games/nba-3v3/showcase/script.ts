import { rimDistance, RIM_SPOT } from "../engine/court";
import type { MatchEvent } from "../engine/events";
import { Match } from "../engine/match";
import { basketDir, rightOf } from "../engine/move-pick";
import { GREEN_MS } from "../engine/shot-model";
import type { Athlete } from "../engine/types";
import { dir2, type V2 } from "../engine/vec";
import type { DunkStyle } from "../roster";

const DUNKER = 1;
const PLAYMAKER = 4;
/** One of the new dunks, and one that reads from the broadcast camera. */
export const SHOWCASE_DUNK: DunkStyle = "windmill";

/** Where everyone stands as the highlight opens: the Dunker squared up to the Lockdown defender on the left wing. */
const OPENING: readonly [number, number, number][] = [
  [0, 4.8, 7.2],
  [DUNKER, -4.6, 7.4],
  [2, 5.9, 1.6],
  [3, -3.9, 6.3],
  [PLAYMAKER, 4.0, 6.3],
  [5, 4.9, 2.4],
];

type Stage = "setup" | "cross" | "drive" | "dunked" | "check" | "stepback" | "shot" | "done";

/**
 * The highlight the showcase films, all of it live play with nothing
 * skipped: the Dunker crosses the Lockdown defender over on the wing, bursts to the rim
 * with the new momentum and throws down a windmill. Then the real check
 * up at the top of the key, the Playmaker bringing it up, and his stepback three.
 * The two leads are steered like players on phones; everyone else plays as
 * the computer would, only without stealing or blocking the scripted
 * plays. Outcomes are forced, so every capture films the same moments.
 */
export class HighlightScript {
  readonly match: Match;
  private stage: Stage = "setup";
  private at = 0;

  constructor(private readonly lead: number) {
    this.match = new Match({
      seed: 4,
      firstOffence: 0,
      entries: [
        { team: 0, build: "shooter", seat: null },
        { team: 0, build: "dunker", seat: null },
        { team: 0, build: "big", seat: null },
        { team: 1, build: "lockdown", seat: null },
        { team: 1, build: "playmaker", seat: null },
        { team: 1, build: "allround", seat: null },
      ],
    });
    const m = this.match;
    m.phase = "live";
    m.phaseT = 0;
    for (const [id, x, z] of OPENING) Object.assign(m.athletes[id]!, { x, z, yaw: Math.PI });
    m.ball.holder = DUNKER;
    m.brains.reset();
    m.athletes[DUNKER]!.auto = false;
  }

  /** Runs before each engine step. `t` is seconds since the showcase started. */
  steer(t: number): void {
    const m = this.match;
    const s = t + this.lead;
    for (const a of m.athletes) {
      a.stealCd = Math.max(a.stealCd, 0.5);
      a.blockCd = Math.max(a.blockCd, 0.5);
    }
    const dunker = m.athletes[DUNKER]!;
    const playmaker = m.athletes[PLAYMAKER]!;
    switch (this.stage) {
      case "setup":
        // A patient dribble at the Lockdown defender, then the crossover to the baseline side.
        dunker.move = toward(dunker, { x: -4.1, z: 7.0 }, 0.3);
        if (s > 0.7) this.next("cross", s, () => m.press(DUNKER, "defend", side(dunker, -1)));
        break;
      case "cross":
        dunker.move = toward(dunker, { x: -3.2, z: 5.2 }, 0.8);
        if (s - this.at > 0.3) this.next("drive", s);
        break;
      case "drive":
        dunker.move = toward(dunker, RIM_SPOT, 1);
        if (rimDistance(dunker) < 3.1 && m.ball.holder === DUNKER) {
          m.forced = "swish";
          m.forcedDunk = SHOWCASE_DUNK;
          m.press(DUNKER, "shoot");
          this.next("dunked", s);
        }
        break;
      case "dunked":
        dunker.move = { x: 0, z: 0 };
        if (m.checkUp) {
          dunker.auto = true;
          // The Playmaker brings it up: he takes the checker's spot, and the ball is checked to him.
          const plan = m.checkUp.plan;
          const mine = plan.spots.get(PLAYMAKER)!;
          plan.spots.set(PLAYMAKER, plan.spots.get(plan.checker)!);
          plan.spots.set(plan.checker, mine);
          plan.checker = PLAYMAKER;
          this.next("check", s);
        }
        break;
      case "check":
        if (m.phase === "live" && m.ball.holder === PLAYMAKER) {
          playmaker.auto = false;
          playmaker.move = { x: 0, z: 0 };
          this.next("stepback", s, () => m.press(PLAYMAKER, "defend", side(playmaker, 0)));
        }
        break;
      case "stepback":
        playmaker.move = { x: 0, z: 0 };
        // Shoot as he lands, as a player on a phone would.
        if (s - this.at > 0.36) {
          m.forced = "swish";
          m.press(PLAYMAKER, "shoot");
          this.next("shot", s);
        }
        break;
      case "shot":
        if (s - this.at >= GREEN_MS / 1000) {
          m.release(PLAYMAKER, GREEN_MS);
          playmaker.auto = true;
          this.next("done", s);
        }
        break;
      case "done":
        break;
    }
  }

  private next(stage: Stage, s: number, then?: () => void): void {
    this.stage = stage;
    this.at = s;
    then?.();
  }

  /** Big moments slow the film down, as they do in the real game. */
  slowFor(e: MatchEvent): { scale: number; seconds: number } | null {
    if (e.type === "dunk") return { scale: 0.32, seconds: 0.6 };
    return null;
  }
}

function toward(a: Athlete, spot: V2, pace: number): V2 {
  const d = dir2(a, spot);
  return { x: d.x * pace, z: d.z * pace };
}

/** The stick for a dribble move: 1 to the right, -1 to the left, 0 pulled back for a stepback. */
function side(a: Athlete, way: -1 | 0 | 1): V2 {
  const f = basketDir(a);
  if (way === 0) return { x: -f.x, z: -f.z };
  const r = rightOf(f);
  return { x: r.x * way, z: r.z * way };
}
