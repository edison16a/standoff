import { rimDistance, RIM_SPOT } from "../engine/court";
import type { MatchEvent } from "../engine/events";
import { Match } from "../engine/match";
import { GREEN_MS } from "../engine/shot-model";
import type { Athlete } from "../engine/types";
import { dir2 } from "../engine/vec";

const VARELAS = 1;
const ZUPAN = 4;

/** Where everyone stands as the highlight opens: Varelas sizing up Whitlock on the left wing. */
const OPENING: readonly [number, number, number][] = [
  [0, 4.8, 7.2],
  [VARELAS, -4.6, 7.4],
  [2, 5.9, 1.6],
  [3, -3.7, 6.2],
  [ZUPAN, 4.0, 6.3],
  [5, 4.9, 2.4],
];

/**
 * The highlight the showcase films: Varelas attacks Whitlock off the wing
 * and throws down his hammer, then the other way Zupan pulls up from the
 * top and splashes a three. The stars are steered like players on
 * phones; everyone else plays as the computer would, only without
 * stealing or blocking the scripted plays. Outcomes are forced, so every
 * capture films the same moments.
 */
export class HighlightScript {
  readonly match: Match;
  private stage: "setup" | "drive" | "dunked" | "zupan" | "shot" | "done" = "setup";
  private checkAt = 0;

  constructor(private readonly lead: number) {
    this.match = new Match({
      seed: 4,
      firstOffence: 0,
      entries: [
        { team: 0, character: "ashby", seat: null },
        { team: 0, character: "varelas", seat: null },
        { team: 0, character: "delacroix", seat: null },
        { team: 1, character: "whitlock", seat: null },
        { team: 1, character: "zupan", seat: null },
        { team: 1, character: "holloway", seat: null },
      ],
    });
    const m = this.match;
    // The film goes straight from the dunk to Zupan's three, without the check up in between.
    m.checkBeat = false;
    m.phase = "live";
    m.phaseT = 0;
    for (const [id, x, z] of OPENING) Object.assign(m.athletes[id]!, { x, z, yaw: Math.PI });
    m.ball.holder = VARELAS;
    m.brains.reset();
    m.athletes[VARELAS]!.auto = false;
  }

  /** Runs before each engine step. `t` is seconds since the showcase started. */
  steer(t: number): void {
    const m = this.match;
    const s = t + this.lead;
    for (const a of m.opponents(m.offence)) {
      a.stealCd = Math.max(a.stealCd, 0.5);
      a.blockCd = Math.max(a.blockCd, 0.5);
    }
    const varelas = m.athletes[VARELAS]!;
    if (this.stage === "setup") {
      // A couple of patient dribbles, then the burst.
      toward(varelas, { x: -3.9, z: 7.0 }, 0.35);
      if (s > 2.3) this.stage = "drive";
    } else if (this.stage === "drive") {
      toward(varelas, RIM_SPOT, 1);
      if (rimDistance(varelas) < 3.1 && m.ball.holder === VARELAS) {
        m.forced = "swish";
        m.forcedDunk = "hammer";
        m.press(VARELAS, "shoot");
        this.stage = "dunked";
      }
    } else if (this.stage === "dunked") {
      varelas.move = { x: 0, z: 0 };
      if (m.phase === "live" && m.offence === 1 && m.ball.holder !== null) {
        this.stage = "zupan";
        this.checkAt = s;
        varelas.auto = true;
        const zupan = m.athletes[ZUPAN]!;
        zupan.auto = false;
        // Zupan brings it up himself: he trades places with whoever was checking the ball.
        const checker = m.holder;
        if (checker && checker !== zupan) {
          [checker.x, checker.z, zupan.x, zupan.z] = [zupan.x, zupan.z, checker.x, checker.z];
          m.ball.holder = ZUPAN;
        }
      }
    } else if (this.stage === "zupan") {
      const zupan = m.athletes[ZUPAN]!;
      toward(zupan, { x: 1.2, z: 8.8 }, 0.55);
      if (s - this.checkAt > 0.55) {
        zupan.move = { x: 0, z: 0 };
        m.forced = "swish";
        m.press(ZUPAN, "shoot");
        this.stage = "shot";
        this.checkAt = s;
      }
    } else if (this.stage === "shot") {
      if (s - this.checkAt >= GREEN_MS / 1000) {
        m.release(ZUPAN, GREEN_MS);
        this.stage = "done";
        m.athletes[ZUPAN]!.auto = true;
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
