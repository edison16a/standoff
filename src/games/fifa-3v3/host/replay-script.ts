import type { MatchView } from "../engine/view";
import { other, type TeamId } from "../teams";
import { describeStrike, type StrikeFacts } from "./replay-facts";

/**
 * A goal replay is cut into stages, each at its own speed and from its
 * own camera, like a television replay: the run in at full speed, the
 * wind up and the strike in deep slow motion close on the kicker, the
 * ball tracked from behind the keeper, slowing again as the keeper
 * dives, and the net at nearly full speed.
 */
export type ReplayStage = "run" | "strike" | "flight" | "dive" | "net";
export type ReplayCamera = "kicker" | "keeper";

export interface ReplaySegment {
  /** Match seconds this stage covers. */
  from: number;
  to: number;
  /** Playback speed: 1 is real time. */
  rate: number;
  stage: ReplayStage;
  camera: ReplayCamera;
}

export interface ReplayScript {
  segments: ReplaySegment[];
  /** Seconds the whole replay takes to play. */
  length: number;
  /** The player who struck the ball, for the close up, and the keeper's team. */
  kicker: number | null;
  keeperTeam: TeamId | null;
  facts: StrikeFacts | null;
  /** Where on the goal the strike was aimed. */
  target: { x: number; y: number; z: number } | null;
}

const RATE: Record<ReplayStage, number> = { run: 1, strike: 0.2, flight: 0.55, dive: 0.25, net: 0.8 };

/** Reads the clip for the strike, the dive and the goal, and lays out the stages. */
export function scriptReplay(clip: readonly MatchView[]): ReplayScript {
  const start = clip[0]?.time ?? 0;
  const end = clip[clip.length - 1]?.time ?? 0;
  const goalAt = clip.find((f) => f.phase === "goal")?.time ?? end;
  const beforeGoal = clip.filter((f) => f.time <= goalAt);
  const lastShot = [...beforeGoal].reverse().find((f) => f.shot !== null)?.shot ?? null;
  const kicker = lastShot?.shooter ?? clip[clip.length - 1]?.scorer ?? null;
  const kickAt = kicker !== null ? strikeTime(beforeGoal, kicker) : null;
  if (kicker === null || kickAt === null) {
    // No strike in the clip, like a deflection off a defender: the whole thing at a gentle slow motion.
    const segments: ReplaySegment[] = [{ from: start, to: end, rate: 0.7, stage: "net", camera: "keeper" }];
    return { segments, length: lengthOf(segments), kicker, keeperTeam: null, facts: null, target: null };
  }
  const team = clip[0]!.athletes[kicker]?.team ?? 0;
  const keeperTeam = other(team);
  const windup = windupStart(beforeGoal, kicker, kickAt);
  const diveAt = diveTime(beforeGoal, keeperTeam, kickAt);
  const cuts: [number, ReplayStage, ReplayCamera][] = [
    [start, "run", "kicker"],
    [windup - 0.05, "strike", "kicker"],
    [kickAt + 0.15, "flight", "keeper"],
    [diveAt ?? Math.max(kickAt + 0.2, goalAt - 0.25), "dive", "keeper"],
    [goalAt + 0.3, "net", "keeper"],
  ];
  const segments: ReplaySegment[] = [];
  for (let i = 0; i < cuts.length; i++) {
    const [at, stage, camera] = cuts[i]!;
    const from = Math.max(start, at, segments[segments.length - 1]?.to ?? start);
    const to = Math.min(end, i + 1 < cuts.length ? cuts[i + 1]![0] : end);
    if (to - from > 1e-3) segments.push({ from, to, rate: RATE[stage], stage, camera });
  }
  const target = lastShot ? { x: lastShot.x, y: lastShot.y, z: lastShot.z } : null;
  return { segments, length: lengthOf(segments), kicker, keeperTeam, facts: describeStrike(clip, kicker, windup, kickAt), target };
}

/** Where in the match `t` seconds of replay lands, and on which stage. */
export function locate(script: ReplayScript, t: number): { time: number; segment: ReplaySegment } | null {
  let left = Math.max(0, t);
  for (const segment of script.segments) {
    const span = (segment.to - segment.from) / segment.rate;
    if (left <= span) return { time: segment.from + left * segment.rate, segment };
    left -= span;
  }
  const last = script.segments[script.segments.length - 1];
  return last ? { time: last.to, segment: last } : null;
}

function lengthOf(segments: readonly ReplaySegment[]): number {
  return segments.reduce((sum, s) => sum + (s.to - s.from) / s.rate, 0);
}

/** The moment the ball left the kicker's boot: the first still showing their shot in the air. */
function strikeTime(frames: readonly MatchView[], kicker: number): number | null {
  for (let i = frames.length - 1; i > 0; i--) {
    const now = frames[i]!.shot;
    const before = frames[i - 1]!.shot;
    if (now?.shooter === kicker && (before === null || before.x !== now.x || before.y !== now.y || before.z !== now.z)) return frames[i]!.time;
  }
  return null;
}

/** When the kicker started the backswing: the start of the shooting action that led to the strike. */
function windupStart(frames: readonly MatchView[], kicker: number, kickAt: number): number {
  let at = kickAt - 0.25;
  for (let i = frames.length - 1; i >= 0; i--) {
    const f = frames[i]!;
    if (f.time > kickAt) continue;
    if (f.athletes[kicker]?.action !== "shoot") {
      if (f.time < kickAt - 0.05) break;
      continue;
    }
    at = f.time;
  }
  return Math.min(at, kickAt - 0.1);
}

/** When the keeper left the ground, if he dived at all. */
function diveTime(frames: readonly MatchView[], team: TeamId, kickAt: number): number | null {
  for (const f of frames) {
    if (f.time <= kickAt) continue;
    const k = f.keepers[team];
    if (k.action === "dive" && k.dive && !k.dive.standing && k.actionT >= k.dive.wait) return f.time;
  }
  return null;
}
