import { SHOTGUN_LIFT, shellLoad, shotgunCloseOut, type TimedStep } from "../../../ballistics";
import { WEAPONS } from "../../../engine/weapons";
import { hand } from "../hands/grips";
import { play, type Key } from "../keyframes";
import { add, attach, type GunPose, type HandPose, type PartPose, type V3 } from "../pose";
import { TRAVEL } from "../rest";
import { at, envelope, jolts, liftBody, type ReloadInput } from "./common";

const PER_SHELL = WEAPONS.shotgun.shell ?? 0.36;
/** Seconds the gun takes to come back down after the last shell, when no rack follows. */
const LOWER = 0.25;

/** How many shells a reload of this length loads. */
export function shellCount(seconds: number): number {
  return Math.max(1, Math.round((seconds - SHOTGUN_LIFT) / PER_SHELL));
}

/** When the engine counts shell `k` (from 1) in, in seconds from the reload's start. */
export const counted = (k: number) => SHOTGUN_LIFT + PER_SHELL * k;

/**
 * The shotgun's reload as one timeline, from the shared pieces: the lift,
 * a shell-in for every shell, and the rack when the chamber was empty.
 * The engine counts shells on its own clock, and this lays each one's
 * steps around that count so the thumb pushes as the click is heard.
 */
export function shotgunSteps(seconds: number, empty: boolean): TimedStep[] {
  const n = shellCount(seconds);
  const steps: TimedStep[] = [{ step: "lift", at: 0 }];
  for (let k = 1; k <= n; k++) for (const s of shellLoad(PER_SHELL)) steps.push({ step: s.step, at: counted(k) + s.at });
  if (empty) for (const s of shotgunCloseOut()) steps.push({ step: s.step, at: counted(n) + s.at });
  return steps;
}

/** When the shotgun's reload is over and the gun back on aim. */
export function shotgunLength(seconds: number, empty: boolean): number {
  const last = counted(shellCount(seconds));
  return empty ? last + Math.max(...shotgunCloseOut().map((s) => s.at)) : last + LOWER;
}

// A shell's path: from the belt, lined up under the port, nose tipped in, then thumbed into the tube.
const FROM_BELT = { pos: [-0.05, -0.3, 0.05] as V3, rot: [0.3, 0, 0.6] as V3 };
const UNDER_PORT = { pos: [0, -0.085, -0.045] as V3, rot: [0, 0, 0] as V3 };
const IN_PORT = { pos: [0, -0.068, -0.06] as V3, rot: [0.35, 0, 0] as V3 };
const IN_TUBE = { pos: [0, -0.034, -0.13] as V3, rot: [0.05, 0, 0] as V3 };
/** The left hand cradles the shell from below, thumb on its brass. */
const ON_SHELL = hand([0, -0.013, 0.012], [0, 1, 0], [0, 0, -1], 0.5, 0.45, 0.8);
/** The thumb straight out, having pushed the shell up into the tube. */
const THUMBED = hand([0, -0.082, -0.03], [0, 1, 0], [0, 0, -1], 0.55, 0.5, 0.05);

type Place = { pos: V3; rot: V3 };

/**
 * The pump gun's reload. It comes up and rolls to show the loading port,
 * and for every shell the left hand brings one up from the belt, lines it
 * up, tips it in and thumbs it into the tube, then goes back for the
 * next. From empty it ends by racking the pump. Firing stops the loading
 * at once, which the rig handles by blending back to the held gun.
 */
export function shotgunReload(pose: GunPose, input: ReloadInput): GunPose {
  const { t, empty } = input;
  const shellsIn = input.steps.filter((s) => s.step === "shell-in").map((s) => s.at);
  const lastCount = counted(shellsIn.length);
  // The shell whose cycle is running: the first whose push has not finished.
  const k = shellsIn.findIndex((s) => t < s + 0.08);
  const rest = pose.support;

  let shell: PartPose = { ...pose.shell, shown: 0 };
  let support: HandPose;
  if (k >= 0) {
    const s = shellsIn[k]!;
    const path: Key<Place>[] = [[s - 0.154, FROM_BELT], [s - 0.04, UNDER_PORT], [s, IN_PORT, "linear"], [s + 0.08, IN_TUBE, "in"]];
    const place = play(path, t);
    shell = { ...place, shown: t >= s - 0.154 && t < s + 0.07 ? 1 : 0 };
    const from = k === 0 ? rest : THUMBED;
    const start = k === 0 ? 0 : shellsIn[k - 1]! + 0.08;
    const holding = attach(place.pos, place.rot, ON_SHELL);
    if (t < s - 0.154) support = play<HandPose>([[start, from], [s - 0.154, attach(FROM_BELT.pos, FROM_BELT.rot, ON_SHELL)]], t);
    else if (t < s) support = holding;
    else support = play<HandPose>([[s, attach(IN_PORT.pos, IN_PORT.rot, ON_SHELL)], [s + 0.07, THUMBED, "out"]], t);
  } else support = play<HandPose>([[lastCount - 0.04, THUMBED], [lastCount + 0.08, rest]], t);

  // From empty, rack the pump once the hand is back on it. The hand rides the fore end.
  const back = at(input, "pump-back");
  const forward = at(input, "pump-forward");
  const rack = empty ? play<number>([[back - 0.04, 0], [back, 1, "out"], [forward - 0.08, 1], [forward, 0, "in"]], t) : 0;
  const pump = Math.max(pose.pump, rack);
  if (k < 0) support = { ...support, pos: add(support.pos, [0, 0, rack * TRAVEL.shotgun.pump]) };

  const posed = { ...pose, shell, support, pump, carrier: Math.max(pose.carrier, rack) };
  const lift = envelope(t, SHOTGUN_LIFT, lastCount, lastCount + 0.2);
  return liftBody(posed, lift, { roll: 0.95, pitch: 0.16, raise: 0.05 }, input.inward, jolts(t, [[forward, 0.5]]));
}
