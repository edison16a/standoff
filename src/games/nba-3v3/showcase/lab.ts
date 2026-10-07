import { RIM_SPOT } from "../engine/court";
import type { MatchEvent } from "../engine/events";
import { callFoul } from "../engine/foul-call";
import { Match } from "../engine/match";
import { basketDir, rightOf } from "../engine/move-pick";
import { GREEN_MS } from "../engine/shot-model";
import type { Athlete } from "../engine/types";
import { dir2, type V2 } from "../engine/vec";
import { DUNK_STYLES, type DunkStyle } from "../roster";
import { DEFENCE_SCENES, DEFENCE_SEEDS, DEFENCE_SPOTS, setupDefence, steerDefence, type DefenceScene } from "./lab-defence";
import { FINISH_SCENES, FINISH_SPOTS, steerFinish, type FinishScene } from "./lab-finishes";
import { SHOT_SCENES, SHOT_SPOTS, isShotScene, setupShot, steerShot, type ShotScene } from "./lab-shots";

const PLAYS = ["moves", "run", "dunk", "block", "free"] as const;
export type LabScene = (typeof PLAYS)[number] | FinishScene | DefenceScene | ShotScene;
export const LAB_SCENES: readonly LabScene[] = [...PLAYS, ...FINISH_SCENES, ...DEFENCE_SCENES, ...SHOT_SCENES];

const SHOOTER = 0;
const DUNKER = 1;
const HOLLOWAY = 5;
const LOCKDOWN = 3;

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
 * The finishes and the celebrations are in `lab-finishes.ts`, the defence in `lab-defence.ts`,
 * and one scene per shot ending (`shot-swish`, `shot-rollIn` and the rest) in `lab-shots.ts`.
 */
export class LabFilm {
  readonly match: Match;
  private fired = 0;
  private done = new Set<string>();

  constructor(readonly scene: LabScene, private readonly style: DunkStyle | null) {
    const defence = isDefence(scene);
    this.match = new Match({
      seed: defence ? DEFENCE_SEEDS[scene] : 7,
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
    m.checkBeat = false;
    m.phase = "live";
    const spots: Record<LabScene, [number, number][]> = {
      moves: [[0, 8.6], [-6, 3], [6, 3], [0, 7.4], [-5, 9], [5, 9]],
      run: [[-4, 9], [4, 6], [6, 2], [-6, 3], [-5, 10], [6, 10]],
      dunk: [[6, 10.5], [-4.6, 7.2], [6.5, 9], [-0.6, 6.4], [5, 10.5], [3.5, 10.5]],
      block: [[0, 6.2], [-6, 3], [6, 3], [-5, 9], [5, 9], [0.1, 5.3]],
      free: [[0, 7], [-4, 6], [4, 6], [0.4, 6.4], [-5, 9], [5, 9]],
      ...FINISH_SPOTS,
      ...DEFENCE_SPOTS,
      ...SHOT_SPOTS,
    };
    spots[scene].forEach(([x, z], id) => Object.assign(m.athletes[id]!, { x, z, yaw: Math.PI }));
    // In the gesture scene the Shooter celebrates with his hands free.
    m.ball.holder = scene === "dunk" || scene === "gesture" ? DUNKER : SHOOTER;
    m.brains.reset();
    const holder = m.athletes[m.ball.holder]!;
    // At the line the computer shoots for the holder, as it would for anyone.
    holder.auto = scene === "free";
    if (scene === "free") callFoul(m, m.athletes[LOCKDOWN]!, holder);
    // The defence stands still where the scene is about the finish, so nobody walls off the drive.
    if (scene === "dunk" || scene === "contact") for (const a of m.athletes) if (a.team === 1) a.auto = false;
    if (defence) setupDefence(scene, m);
    if (isShotScene(scene)) setupShot(m);
  }

  steer(t: number): void {
    const m = this.match;
    // The lab shows animation, not the defence winning: no steals, and blocks only where asked.
    for (const a of m.athletes) {
      a.stealCd = Math.max(a.stealCd, 0.5);
      if (this.scene !== "block" && this.scene !== "swat") a.blockCd = Math.max(a.blockCd, 0.5);
    }
    if (this.scene === "moves") this.moves(t);
    else if (this.scene === "run") this.run(t);
    else if (this.scene === "dunk") this.dunk(t);
    else if (this.scene === "block") this.block(t);
    else if ((FINISH_SCENES as readonly string[]).includes(this.scene)) steerFinish(this.scene as FinishScene, m, t, (key) => this.once(key));
    else if (isDefence(this.scene)) steerDefence(this.scene, m, t, (key) => this.once(key));
    else if (isShotScene(this.scene)) steerShot(this.scene, m, t, (key) => this.once(key));
  }

  private moves(t: number): void {
    const m = this.match;
    const a = m.athletes[SHOOTER]!;
    a.move = t > 6.4 ? toward(a, RIM_SPOT, 1) : { x: 0, z: 0 };
    const cue = MOVE_CUES[this.fired];
    if (!cue || t < cue[0]) return;
    this.fired++;
    a.moveHeat = 0;
    m.press(SHOOTER, "defend", aimFor(a, cue[1]));
  }

  private run(t: number): void {
    const m = this.match;
    const a = m.athletes[SHOOTER]!;
    const legs: [number, V2][] = [[0.3, { x: 0, z: 0 }], [1.6, { x: 1, z: 0 }], [2.6, { x: -1, z: 0 }], [3.6, { x: 0.3, z: -1 }], [4.4, { x: 0, z: 0 }]];
    const leg = legs.find(([until]) => t < until);
    a.move = leg ? leg[1] : { x: 0, z: 0 };
    if (t > 5 && this.once("pass")) m.press(SHOOTER, "pass", dir2(a, m.athletes[DUNKER]!));
  }

  private dunk(t: number): void {
    const m = this.match;
    const a = m.athletes[DUNKER]!;
    if (m.ball.holder !== DUNKER || a.action.kind === "drive") {
      a.move = { x: 0, z: 0 };
      return;
    }
    a.move = t < 0.6 ? toward(a, { x: -3.9, z: 7 }, 0.3) : toward(a, RIM_SPOT, 1);
    if (t > 0.6 && Math.hypot(a.x - RIM_SPOT.x, a.z - RIM_SPOT.z) < 3.1 && this.once("dunk")) {
      m.forced = "swish";
      m.forcedFinish = { dunk: this.style ?? DUNK_STYLES[0] };
      m.press(DUNKER, "shoot");
    }
  }

  private block(t: number): void {
    const m = this.match;
    if (t > 0.4 && this.once("shoot")) {
      m.forced = "rimOut";
      m.press(SHOOTER, "shoot");
    }
    if (t > 0.4 + GREEN_MS / 1000 && this.once("release")) m.release(SHOOTER, GREEN_MS);
    if (t > 0.62 && this.once("block")) m.press(HOLLOWAY, "defend");
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

function isDefence(scene: LabScene): scene is DefenceScene {
  return (DEFENCE_SCENES as readonly string[]).includes(scene);
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
