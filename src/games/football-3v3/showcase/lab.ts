import type { AthleteView, MatchView } from "../engine";
import { KICK, PASS, STEP, TACKLE } from "../engine/tuning";
import type { ActionKind, JukeKind } from "../engine/types";
import { BUILD_IDS, BUILDS, LINEMAN_NUMBERS } from "../builds";
import { STAGE_MOVES, STAGES, type StageMove } from "./lab-scenes";
import { recordStage } from "./lab-stage";

/**
 * A development stage for looking closely at the models and one
 * animation at a time: all six builds in a row doing the same thing on
 * a loop, with a pair of linemen alongside. Pick it with ?lab=<move>.
 */
const POSE_MOVES = ["idle", "run", "tuck", "ready", "throw", "kick", "spin", "back", "side", "dive", "lunge", "down", "tackled", "celebrate", "spike", "stance", "block", "catch"] as const;
type PoseMove = (typeof POSE_MOVES)[number];
/** The single poses on a row of builds, then the staged tackles, misses and runs (lab-scenes.ts). */
export const LAB_MOVES = [...POSE_MOVES, ...STAGE_MOVES] as const;
export type LabMove = PoseMove | StageMove;

export function isLabMove(v: string | null): v is LabMove {
  return v !== null && (LAB_MOVES as readonly string[]).includes(v);
}

interface Act {
  action: ActionKind;
  dur: number;
  speed: number;
  juke?: JukeKind;
  hasBall?: boolean;
  downCause?: AthleteView["downCause"];
  spike?: boolean;
}

function act(move: PoseMove): Act {
  switch (move) {
    case "idle": return { action: "none", dur: 0, speed: 0 };
    case "run": return { action: "none", dur: 0, speed: 8.5 };
    case "tuck": return { action: "none", dur: 0, speed: 8.5, hasBall: true };
    case "ready": return { action: "none", dur: 0, speed: 0, hasBall: true };
    case "throw": return { action: "throw", dur: PASS.throwTime, speed: 0, hasBall: true };
    case "kick": return { action: "kick", dur: KICK.windup + 1, speed: 0 };
    case "spin": case "back": case "side": return { action: "juke", dur: move === "spin" ? 0.55 : 0.45, speed: 6, juke: move, hasBall: true };
    case "dive": return { action: "dive", dur: TACKLE.diveTime, speed: 0 };
    case "lunge": return { action: "lunge", dur: TACKLE.lungeTime, speed: 0 };
    case "down": return { action: "down", dur: 2.4, speed: 0, downCause: "dive" };
    case "tackled": return { action: "down", dur: 2.4, speed: 0, downCause: "tackled" };
    case "celebrate": return { action: "celebrate", dur: 3.6, speed: 0 };
    case "spike": return { action: "celebrate", dur: 3.6, speed: 0, hasBall: true, spike: true };
    case "stance": return { action: "stance", dur: 0, speed: 0 };
    case "block": return { action: "none", dur: 0, speed: 0 };
    case "catch": return { action: "none", dur: 0, speed: 3 };
  }
}

/** The lab's still for a moment `time` seconds in: everyone lined up across the field, facing the camera at -x. */
export function labView(base: MatchView, move: LabMove, time: number): MatchView {
  if (move in STAGES) return stageView(base, move as StageMove, time);
  const a = act(move as PoseMove);
  const cycle = Math.max(1.6, a.dur + 1);
  const t = a.dur > 0 ? Math.min(a.dur, time % cycle) : time;
  // The engine turns a spinning runner right round over the juke, so the lab does too.
  const yaw = -Math.PI / 2 + (move === "spin" ? (Math.PI * 2 * t) / a.dur : 0);
  const athletes: AthleteView[] = BUILD_IDS.map((id, i) => ({
    ...base.athletes[0]!, id: i, team: i < 3 ? 0 : 1, role: i === 0 || i === 3 ? "qb" : "runner", build: id, number: BUILDS[id].number,
    // Runners really run, round a loop in front of the camera, so their feet plant on the turf.
    seat: null, x: a.speed > 0 && move !== "catch" ? 6 - ((time * a.speed) % 12) : 0, z: (i - 2.5) * 2.6, yaw, vx: -a.speed, vz: 0, speed: a.speed,
    action: a.action, actionT: t, actionDur: a.dur, juke: a.juke ?? null, side: 1, spike: !!a.spike,
    hasBall: false, targeted: move === "catch", guarding: null, rushing: false, blocked: false, downCause: a.downCause ?? null,
  }));
  // Two linemen at the end of the row, squared up against each other.
  for (const team of [0, 1] as const) {
    athletes.push({
      ...athletes[0]!, id: athletes.length, team, role: "lineman", build: null, number: LINEMAN_NUMBERS[team][1]!,
      x: team === 0 ? 0.55 : -0.55, z: 10.5, yaw: team === 0 ? -Math.PI / 2 : Math.PI / 2, vx: 0, speed: 0,
      action: move === "stance" ? "stance" : "none", blocked: move === "block", targeted: false, spike: false,
    });
  }
  const holder = a.hasBall ? 0 : null;
  if (holder !== null) athletes[0]!.hasBall = true;
  const ball = move === "catch"
    ? { ...base.ball, state: "pass" as const, holder: null, x: -3 + ((time * 6) % 4), y: 1.9, z: -6.5, vx: -12, vy: 0, vz: 0 }
    : { ...base.ball, state: holder === null ? ("dead" as const) : ("held" as const), holder, x: 3, y: 0.15, z: 12 };
  return { ...base, phase: move === "stance" ? "presnap" : "live", athletes, ball, kick: null, scorer: null };
}

const recorded = new Map<StageMove, AthleteView[][]>();

/** A staged moment on a loop, recorded once from the engine pieces. */
function stageView(base: MatchView, move: StageMove, time: number): MatchView {
  let frames = recorded.get(move);
  if (!frames) {
    frames = recordStage(STAGES[move]);
    recorded.set(move, frames);
  }
  const at = frames[Math.floor(time / STEP) % frames.length]!;
  const athletes = at.map((a) => ({ ...base.athletes[0]!, ...a }));
  const ball = { ...base.ball, state: "held" as const, holder: 0 };
  return { ...base, phase: "live", athletes, ball, kick: null, scorer: null };
}
