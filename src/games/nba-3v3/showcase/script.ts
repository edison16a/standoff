import { rimDistance, RIM_SPOT } from "../engine/court";
import type { MatchEvent } from "../engine/events";
import { Match } from "../engine/match";
import { GREEN_MS } from "../engine/shot-model";
import type { Athlete } from "../engine/types";
import { dir2 } from "../engine/vec";

const GIANNIS = 1;
const LUKA = 4;

/** Where everyone stands as the highlight opens: Giannis sizing up LeBron on the left wing. */
const OPENING: readonly [number, number, number][] = [
  [0, 4.8, 7.2],
  [GIANNIS, -4.6, 7.4],
  [2, 5.9, 1.6],
  [3, -3.7, 6.2],
  [LUKA, 4.0, 6.3],
  [5, 4.9, 2.4],
];

/**
 * The highlight the showcase films: Giannis attacks LeBron off the wing
 * and throws down his hammer, then the other way Luka pulls up from the
 * top and splashes a three. The stars are steered like players on
 * phones; everyone else plays as the computer would, only without
 * stealing or blocking the scripted plays. Outcomes are forced, so every
 * capture films the same moments.
 */
export class HighlightScript {
  readonly match: Match;
  private stage: "setup" | "drive" | "dunked" | "luka" | "shot" | "done" = "setup";
  private checkAt = 0;

  constructor(private readonly lead: number) {
    this.match = new Match({
      seed: 4,
      firstOffence: 0,
      entries: [
        { team: 0, character: "curry", seat: null },
        { team: 0, character: "giannis", seat: null },
        { team: 0, character: "wemby", seat: null },
        { team: 1, character: "lebron", seat: null },
        { team: 1, character: "doncic", seat: null },
        { team: 1, character: "edwards", seat: null },
      ],
    });
    const m = this.match;
    m.phase = "live";
    m.phaseT = 0;
    for (const [id, x, z] of OPENING) Object.assign(m.athletes[id]!, { x, z, yaw: Math.PI });
    m.ball.holder = GIANNIS;
    m.brains.reset();
    m.athletes[GIANNIS]!.auto = false;
  }

  /** Runs before each engine step. `t` is seconds since the showcase started. */
  steer(t: number): void {
    const m = this.match;
    const s = t + this.lead;
    for (const a of m.opponents(m.offence)) {
      a.stealCd = Math.max(a.stealCd, 0.5);
      a.blockCd = Math.max(a.blockCd, 0.5);
    }
    const giannis = m.athletes[GIANNIS]!;
    if (this.stage === "setup") {
      // A couple of patient dribbles, then the burst.
      toward(giannis, { x: -3.9, z: 7.0 }, 0.35);
      if (s > 2.3) this.stage = "drive";
    } else if (this.stage === "drive") {
      toward(giannis, RIM_SPOT, 1);
      if (rimDistance(giannis) < 3.1 && m.ball.holder === GIANNIS) {
        m.forced = "swish";
        m.press(GIANNIS, "shoot");
        this.stage = "dunked";
      }
    } else if (this.stage === "dunked") {
      giannis.move = { x: 0, z: 0 };
      if (m.phase === "live" && m.offence === 1 && m.ball.holder !== null) {
        this.stage = "luka";
        this.checkAt = s;
        giannis.auto = true;
        const luka = m.athletes[LUKA]!;
        luka.auto = false;
        // Luka brings it up himself: he trades places with whoever was checking the ball.
        const checker = m.holder;
        if (checker && checker !== luka) {
          [checker.x, checker.z, luka.x, luka.z] = [luka.x, luka.z, checker.x, checker.z];
          m.ball.holder = LUKA;
        }
      }
    } else if (this.stage === "luka") {
      const luka = m.athletes[LUKA]!;
      toward(luka, { x: 1.2, z: 8.8 }, 0.55);
      if (s - this.checkAt > 0.55) {
        luka.move = { x: 0, z: 0 };
        m.forced = "swish";
        m.press(LUKA, "shoot");
        this.stage = "shot";
        this.checkAt = s;
      }
    } else if (this.stage === "shot") {
      if (s - this.checkAt >= GREEN_MS / 1000) {
        m.release(LUKA, GREEN_MS);
        this.stage = "done";
        m.athletes[LUKA]!.auto = true;
      }
    }
  }

  /** Big moments slow the film down, as they do in the real game. */
  slowFor(e: MatchEvent): { scale: number; seconds: number } | null {
    if (e.type === "dunk") return { scale: 0.32, seconds: 0.6 };
    return null;
  }
}

function toward(a: Athlete, spot: { x: number; z: number }, pace: number): void {
  const d = dir2(a, spot);
  a.move = { x: d.x * pace, z: d.z * pace };
}
