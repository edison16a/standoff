import type { BuildId } from "../builds";
import { createAthlete } from "../engine/body";
import { knockDown, updateDown } from "../engine/down";
import { resolveHit } from "../engine/hit";
import { startJuke, updateJuke } from "../engine/juke";
import { jukeBeats, updateStumble } from "../engine/juke-beat";
import { moveAthlete } from "../engine/motion";
import { Rng } from "../engine/rng";
import { home } from "../engine/tackle";
import { bindTackle, followBinds } from "../engine/tackle-bind";
import type { ApproachKind, TackleKind } from "../engine/tackle-preset";
import { STEP, TACKLE } from "../engine/tuning";
import type { Athlete } from "../engine/types";
import { athleteView, type AthleteView } from "../engine/view-athlete";
import { dir2, dist2, type V2 } from "../engine/vec";

/**
 * A tiny field for the animation lab: the real engine pieces (running,
 * jukes, the hit, tackle binding, the slide) on two or three men, with
 * the outcome forced so each preset can be watched on a loop. The
 * carrier always runs up +z through the middle of the picture.
 */
export type Outcome = TackleKind | "missed" | "shed" | "whiff" | "none";

export interface Cast {
  build: BuildId | "lineman";
  /** Where he stands when the clip starts, from the carrier's start. */
  at: V2;
  vel?: V2;
  /** The stick he runs on until he lunges; without it he pulls up. */
  move?: V2;
  /** Seconds in when he presses tackle, and the preset his lunge is drawn as. */
  lunge?: { at: number; approach: ApproachKind; aim?: V2 };
}

export interface Stage {
  carrier: BuildId | "lineman";
  speed: number;
  /** Stick changes for the carrier: from `at` seconds the stick is `move`, with a juke pressed if `juke`. */
  sticks?: { at: number; move: V2; juke?: boolean }[];
  cast: Cast[];
  outcome: Outcome;
  length: number;
}

function make(id: number, build: BuildId | "lineman", team: 0 | 1, at: V2, vel: V2): Athlete {
  const a = createAthlete(id, team, build === "lineman" ? "lineman" : "runner", 0, build === "lineman" ? null : build, null);
  Object.assign(a, { x: at.x, z: at.z, vx: vel.x, vz: vel.z, yaw: Math.atan2(vel.x || 1e-6, vel.z) });
  return a;
}

/** Runs the stage through and keeps a still of every man at every step. */
export function recordStage(stage: Stage): AthleteView[][] {
  const rng = new Rng(5);
  const carrier = make(0, stage.carrier, 0, { x: 0, z: -5.5 }, { x: 0, z: stage.speed });
  carrier.move = { x: 0, z: 1 };
  const cast = stage.cast.map((c, i) => make(i + 1, c.build, 1, { x: c.at.x, z: c.at.z - 5.5 }, c.vel ?? { x: 0, z: 0 }));
  for (const [i, a] of cast.entries()) {
    const c = stage.cast[i]!;
    if (!c.vel) a.yaw = Math.atan2(carrier.x - a.x, carrier.z - a.z);
    if (c.move) a.move = c.move;
  }
  const list = [carrier, ...cast];
  const frames: AthleteView[][] = [];
  for (let t = 0; t < stage.length; t += STEP) {
    for (const s of stage.sticks ?? []) {
      if (t < s.at || t - STEP >= s.at) continue;
      carrier.move = s.move;
      if (s.juke) startJuke(carrier, () => {});
    }
    for (const [i, a] of cast.entries()) {
      const l = stage.cast[i]!.lunge;
      if (!l || t < l.at || t - STEP >= l.at) continue;
      const dir = l.aim ?? dir2(a, { x: carrier.x + carrier.vx * 0.22, z: carrier.z + carrier.vz * 0.22 });
      const speed = Math.max(TACKLE.lungeSpeed, Math.hypot(a.vx, a.vz) + 2.5);
      a.action = { kind: "lunge", t: 0, dur: TACKLE.lungeTime, dir, target: 0, approach: l.approach };
      Object.assign(a, { vx: dir.x * speed, vz: dir.z * speed, yaw: Math.atan2(dir.x, dir.z) });
    }
    for (const a of list) step(a, list, stage, rng);
    frames.push(list.map((a) => athleteView(a, a === carrier, false, null)));
  }
  return frames;
}

function step(a: Athlete, list: Athlete[], stage: Stage, rng: Rng): void {
  const carrier = list[0]!;
  a.stagger = Math.max(0, a.stagger - STEP);
  a.jukeCd = Math.max(0, a.jukeCd - STEP);
  updateStumble(a, STEP);
  const act = a.action;
  if (act.kind === "juke") {
    updateJuke(a, STEP);
    jukeBeats(list, a, STEP);
  } else if (act.kind === "down") updateDown(a, STEP);
  else if (act.kind === "lunge") lunge(a, carrier, list, stage, rng);
  // Once down, the carrier is done running for the clip.
  if (a === carrier && a.action.kind === "down") a.move = { x: 0, z: 0 };
  moveAthlete(a, STEP, a === carrier, a === carrier ? null : carrier, 1);
  if (a === list[list.length - 1]) followBinds(list);
}

/** A lunge in the lab: it homes like the game's, then the stage's outcome plays at contact. */
function lunge(a: Athlete, carrier: Athlete, list: Athlete[], stage: Stage, rng: Rng): void {
  const act = a.action;
  if (act.kind !== "lunge") return;
  act.t += STEP;
  const k = Math.max(0, 1 - 1.2 * STEP);
  a.vx *= k;
  a.vz *= k;
  const out = stage.outcome;
  if (out === "whiff") {
    if (act.t >= act.dur) knockDown(a, TACKLE.whiffDown, "whiff");
    return;
  }
  if (act.t < 0.25 && out !== "missed") home(a, carrier, STEP);
  if (act.t > 0.04 && dist2(a, carrier) < TACKLE.contact && carrier.action.kind !== "down") {
    if (out === "missed") return knockDown(a, TACKLE.missedDown, "missed");
    const hit = resolveHit(a, carrier, rng);
    if (out === "shed" || out === "none") {
      carrier.stagger = 0.5;
      return knockDown(a, TACKLE.shedDown, "shed");
    }
    const helpers = list.filter((h) => h !== a && h !== carrier && h.role !== "lineman" && h.action.kind === "none");
    return bindTackle(out, carrier, a, hit.n, out === "gang" ? helpers : []);
  }
  if (act.t >= act.dur) knockDown(a, TACKLE.whiffDown, "whiff");
}
