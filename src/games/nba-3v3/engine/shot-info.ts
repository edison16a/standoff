import { buildOf } from "./athlete";
import type { Match } from "./match";
import { freshTrack } from "./physics/shot-watch";
import { newFlight } from "./shot-outcome/flight";
import type { Grade, ShotKind } from "./shot-model";
import type { Athlete, ShotInfo } from "./types";
import type { V3 } from "./vec";

/** The ball leaves the hand on a shot, from `at`. */
export function letGo(m: Match, a: Athlete, at: V3): void {
  const b = m.ball;
  b.holder = null;
  b.mode = "flight";
  b.flightT = 0;
  b.flightKind = "shot";
  b.lastTouch = a.id;
  b.pos = { ...at };
  b.hand = "none";
  b.passTo = null;
  b.aim = null;
}

/** A fresh record of a shot as it leaves the hand, before its ending is picked. */
export function shotInfo(m: Match, a: Athlete, kind: ShotKind, grade: Grade, points: 1 | 2 | 3, contest: number, distance: number): ShotInfo {
  const assist = kind !== "free" && m.lastPass && m.lastPass.to === a.id ? m.lastPass.from : null;
  const dunk = kind === "dunk" ? (a.action.kind === "drive" && a.action.style ? a.action.style : buildOf(a).dunk) : null;
  return { shooter: a.id, team: a.team, points, kind, dunk, grade, outcome: "swish", preset: "swish", made: false, counted: false, touchedRim: kind === "dunk", assist, contest, distance, track: freshTrack(), flight: newFlight(null), rolled: [], evade: 0 };
}
