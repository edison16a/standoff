import { buildOf } from "../athlete";
import { landTime } from "../body/drive-flight";
import { RIM_SPOT, rimDistance } from "../court";
import { between, type Rng } from "../rng";
import { BOARD, RIM } from "../tuning";
import type { Athlete } from "../types";
import { clamp, dir2, dist2, yawOf, type V2, type V3 } from "../vec";
import { DUNK_SPEC } from "./dunks";
import { LAYUP_SPEC } from "./layups";
import { ARM_USE, armLength, shoulderAt, shoulderHeight } from "./reach";
import type { FinishChoice } from "./select";
import type { FinishSpec, LayupSpec } from "./spec";
import { finishSide, underSpot } from "./spots";

type Drive = Extract<Athlete["action"], { kind: "drive" }>;

/** The fastest the feet carry the body through a gather, metres a second. */
const MAX_STEP_SPEED = 5.5;
/** The highest a body goes up for a dunk, metres: a small guard with space gets up there; past it a player lays it in. */
export const MAX_DUNK_PEAK = 1.3;
/** At the slam the ball is just over the ring on the near side, the palm on top of it. */
const SLAM_UP = 0.16;
const SLAM_IN = 0.1;
const PALM_ON_TOP = 0.09;

/** Whether this body can get a hand with the ball over the ring at all. */
export function canDunk(a: Athlete): boolean {
  return dunkPeak(a, 0.36, 1) <= MAX_DUNK_PEAK;
}

/**
 * How high the feet must be for the hand to be over the ring with the
 * ball: the body `stop` from the rim, the ball just in from the front
 * of the ring, the arm nearly straight from the shoulder.
 */
function dunkPeak(a: Athlete, stop: number, hands: 1 | 2): number {
  const reach = armLength(a) * ARM_USE - 0.02;
  // Shoulder to ball across the floor: the body's stop, less the lean and the ball's place in from the ring, and the shoulder's width.
  const across = Math.hypot(Math.max(0, stop - SLAM_IN - 0.05), buildOf(a).body.height * buildOf(a).body.width * 0.1);
  const up = Math.sqrt(Math.max(0, reach * reach - across * across));
  return RIM.y + SLAM_UP + (hands === 1 ? PALM_ON_TOP : 0.03) - shoulderHeight(a) - up;
}

/**
 * Lays out the whole finish for this body: where the feet leave the
 * floor and where they are at the release, the timing, the jump, the
 * point at the rim the hand takes the ball to, and a hang on the rim.
 */
export function planFinish(rng: Rng, a: Athlete, pick: FinishChoice, ball: V3): Drive {
  const spec: FinishSpec = pick.dunk ? DUNK_SPEC[pick.style ?? "flush"] : LAYUP_SPEC[pick.layup ?? "finger"];
  const d = rimDistance(a);
  const from = { x: a.x, z: a.z };
  const to = finishSpot(a, pick, spec, d);
  // A longer run in makes for a longer gather.
  const run = dist2(from, to);
  // A longer run in makes for a longer gather, and never steps faster than a sprint: a quick preset from far out takes its time.
  const gather = Math.max(spec.gather * clamp(0.85 + (d - dist2(to, RIM_SPOT)) * 0.08, 0.85, 1.15), (run * 0.65) / MAX_STEP_SPEED);
  const air = spec.air;
  const baseYaw = spec.yaw === "path" ? yawOf(to.x - from.x, to.z - from.z) : yawOf(RIM.x - a.x, RIM.z - a.z);
  const finishYaw = (spec.yaw === "path" ? baseYaw : yawOf(RIM.x - to.x, RIM.z - to.z)) + (spec.turn ? spec.turn.turns * Math.PI * 2 * -pick.side : 0);
  let peak: number;
  let release: V3;
  let hangY = 0;
  let rimHang = 0;
  if (pick.dunk) {
    const ds = DUNK_SPEC[pick.style ?? "flush"];
    peak = clamp(dunkPeak(a, dist2(to, RIM_SPOT), ds.hands), 0.5, MAX_DUNK_PEAK);
    const back = dir2(RIM_SPOT, to);
    release = { x: RIM.x + back.x * SLAM_IN, y: RIM.y + SLAM_UP, z: RIM.z + back.z * SLAM_IN };
    rimHang = pick.style === "rimhang" ? 0.55 : rng() < ds.hang ? between(rng, 0.32, 0.48) : 0;
    // Hanging, the arms are straight up holding the front of the ring.
    hangY = Math.min(peak - 0.05, RIM.y + 0.04 - shoulderHeight(a) - armLength(a) * 0.97);
  } else {
    const ls = spec as LayupSpec;
    peak = ls.peak * clamp(0.85 + buildOf(a).stats.speed * 0.025, 0.9, 1.1);
    release = layupRelease(a, ls, { x: to.x, y: peak, z: to.z }, finishYaw, pick.hand);
  }
  const timing = { takeoff: gather, finish: gather + air, rimHang, peak, hangY };
  return {
    kind: "drive", t: 0, dunk: pick.dunk, style: pick.style, layup: pick.layup, from, to, ...timing,
    land: landTime(timing), released: false, hand: pick.hand, side: pick.side, pick: { ...ball }, release, baseYaw,
  };
}

/** Where the body is as the ball goes: in front of the rim on the drive's side, stepped off to the side for some. */
function finishSpot(a: Athlete, pick: FinishChoice, spec: FinishSpec, d: number): V2 {
  if (pick.layup === "reverse") return underSpot(a);
  const away = finishSide(a, d);
  // Never back the way he came: a driver already in close finishes a little in from where he is.
  let stop = Math.min(spec.stop, Math.max(pick.dunk ? 0.34 : 0.55, d - 0.35));
  if (pick.layup === "teardrop") stop = clamp(d - 0.45, spec.stop, 2.8);
  // Off the line toward `side`: the right of the run in (along -away) is (away.z, -away.x).
  const shift = spec.shift * pick.side;
  const spot = { x: RIM.x + away.x * stop + away.z * shift, z: RIM.z + away.z * stop - away.x * shift };
  // Never under the glass.
  spot.z = Math.max(spot.z, BOARD.face + 0.4);
  return spot;
}

/** The layup's hand at the release: a reach from the shoulder up, toward the rim and out to the hand side. */
function layupRelease(a: Athlete, ls: LayupSpec, at: V3, yaw: number, hand: number): V3 {
  const sh = shoulderAt(a, at, yaw, hand, { x: 0, y: 0, z: 0 });
  const to = dir2({ x: sh.x, z: sh.z }, RIM_SPOT);
  // The hand side, as a floor direction: the driver's right facing the rim is (-to.z, to.x).
  const sx = -to.z * hand;
  const sz = to.x * hand;
  const r = ls.release;
  const vx = to.x * r.rim + sx * r.side;
  const vz = to.z * r.rim + sz * r.side;
  const len = Math.hypot(vx, r.up, vz);
  const ext = armLength(a) * Math.min(r.ext, ARM_USE);
  return { x: sh.x + (vx / len) * ext, y: sh.y + (r.up / len) * ext, z: sh.z + (vz / len) * ext };
}
