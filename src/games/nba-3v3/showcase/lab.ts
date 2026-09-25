import { RIM_SPOT } from "../engine/court";
import type { MatchEvent } from "../engine/events";
import { callFoul } from "../engine/free-throw";
import { Match } from "../engine/match";
import { basketDir, rightOf } from "../engine/move-pick";
import { GREEN_MS } from "../engine/shot-model";
import type { Athlete } from "../engine/types";
import { dir2, type V2 } from "../engine/vec";
import { DUNK_STYLES, type DunkStyle } from "../roster";

export const LAB_SCENES = ["moves", "run", "dunk", "block", "free"] as const;
export type LabScene = (typeof LAB_SCENES)[number];

const CURRY = 0;
const GIANNIS = 1;
const EDWARDS = 5;
const LEBRON = 3;

/** What the stick does at a moment of the moves scene: the Dribble button with an aim. */
type Cue = readonly [at: number, aim: "back" | "left" | "right" | "fwd" | "none"];
const MOVE_CUES: readonly Cue[] = [[0.6, "back"], [1.7, "left"], [2.6, "right"], [3.6, "fwd"], [4.9, "none"], [6.0, "none"]];

/**
 * A development aid for reviewing the animation frame by frame: short
 * fixed plays that show one thing each. Open
 * `/showcase/nba-3v3?lab=moves&step=1` and drive `window.__nbaStep`.
 * `moves` runs every dribble move into a defender, `run` sprints and
 * cuts with the ball then passes, `dunk` throws `&style=` at the rim,
 * `block` jumps at a jumper, and `free` calls a foul for free throws.
 */
export class LabFilm {
  readonly match: Match;
  private fired = 0;
  private done = new Set<string>();

  constructor(readonly scene: LabScene, private readonly style: DunkStyle | null) {
    this.match = new Match({
      seed: 7,
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
    m.checkBeat = false;
    m.phase = "live";
    const spots: Record<LabScene, [number, number][]> = {
      moves: [[0, 8.6], [-6, 3], [6, 3], [0, 7.4], [-5, 9], [5, 9]],
      run: [[-4, 9], [4, 6], [6, 2], [-6, 3], [-5, 10], [6, 10]],
      dunk: [[5, 8], [-4.6, 7.2], [6, 2], [-2.5, 5.5], [5, 9], [5, 3]],
      block: [[0, 6.2], [-6, 3], [6, 3], [-5, 9], [5, 9], [0.1, 5.3]],
      free: [[0, 7], [-4, 6], [4, 6], [0.4, 6.4], [-5, 9], [5, 9]],
    };
    spots[scene].forEach(([x, z], id) => Object.assign(m.athletes[id]!, { x, z, yaw: Math.PI }));
    m.ball.holder = scene === "dunk" ? GIANNIS : CURRY;
    m.brains.reset();
    const star = m.athletes[m.ball.holder]!;
    star.auto = false;
    if (scene === "free") callFoul(m, m.athletes[LEBRON]!, star);
  }

  steer(t: number): void {
    const m = this.match;
    // The lab shows animation, not the defence winning: no steals, and blocks only where asked.
    for (const a of m.athletes) {
      a.stealCd = Math.max(a.stealCd, 0.5);
      if (this.scene !== "block") a.blockCd = Math.max(a.blockCd, 0.5);
    }
    if (this.scene === "moves") this.moves(t);
    else if (this.scene === "run") this.run(t);
    else if (this.scene === "dunk") this.dunk(t);
    else if (this.scene === "block") this.block(t);
  }

  private moves(t: number): void {
    const m = this.match;
    const a = m.athletes[CURRY]!;
    a.move = t > 6.4 ? toward(a, RIM_SPOT, 1) : { x: 0, z: 0 };
    const cue = MOVE_CUES[this.fired];
    if (!cue || t < cue[0]) return;
    this.fired++;
    a.moveHeat = 0;
    m.press(CURRY, "defend", aimFor(a, cue[1]));
  }

  private run(t: number): void {
    const m = this.match;
    const a = m.athletes[CURRY]!;
    const legs: [number, V2][] = [[0.3, { x: 0, z: 0 }], [1.6, { x: 1, z: 0 }], [2.6, { x: -1, z: 0 }], [3.6, { x: 0.3, z: -1 }], [4.4, { x: 0, z: 0 }]];
    const leg = legs.find(([until]) => t < until);
    a.move = leg ? leg[1] : { x: 0, z: 0 };
    if (t > 5 && this.once("pass")) m.press(CURRY, "pass", dir2(a, m.athletes[GIANNIS]!));
  }

  private dunk(t: number): void {
    const m = this.match;
    const a = m.athletes[GIANNIS]!;
    if (m.ball.holder !== GIANNIS || a.action.kind === "drive") {
      a.move = { x: 0, z: 0 };
      return;
    }
    a.move = t < 0.6 ? toward(a, { x: -3.9, z: 7 }, 0.3) : toward(a, RIM_SPOT, 1);
    if (t > 0.6 && Math.hypot(a.x - RIM_SPOT.x, a.z - RIM_SPOT.z) < 3.1 && this.once("dunk")) {
      m.forced = "swish";
      m.forcedDunk = this.style ?? DUNK_STYLES[0];
      m.press(GIANNIS, "shoot");
    }
  }

  private block(t: number): void {
    const m = this.match;
    if (t > 0.4 && this.once("shoot")) {
      m.forced = "rimOut";
      m.press(CURRY, "shoot");
    }
    if (t > 0.4 + GREEN_MS / 1000 && this.once("release")) m.release(CURRY, GREEN_MS);
    if (t > 0.62 && this.once("block")) m.press(EDWARDS, "defend");
  }

  private once(key: string): boolean {
    if (this.done.has(key)) return false;
    this.done.add(key);
    return true;
  }

  slowFor(e: MatchEvent): { scale: number; seconds: number } | null {
    void e;
    return null;
  }
}

function toward(a: Athlete, spot: V2, pace: number): V2 {
  const d = dir2(a, spot);
  return { x: d.x * pace, z: d.z * pace };
}

function aimFor(a: Athlete, aim: Cue[1]): V2 | null {
  const f = basketDir(a);
  const r = rightOf(f);
  if (aim === "back") return { x: -f.x, z: -f.z };
  if (aim === "fwd") return f;
  if (aim === "left") return { x: -r.x, z: -r.z };
  if (aim === "right") return r;
  return null;
}
