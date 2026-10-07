import { TACKLE } from "../../../engine/tuning";
import { keyed, over, type Keys, type Pose } from "../pose";
import { BASE, KNEEL, PRONE, PUSH_UP } from "./body-keys";

/**
 * Getting back up, by how the man ended up lying. Face down he pushes
 * up on his hands and brings a knee through; on his back he sits up
 * first, rolled over on his back or side he turns onto his front first,
 * and from his seat he gets a knee under him. Each runs over the last
 * TACKLE.getUp seconds of his time on the ground.
 */
export type Lying = "front" | "back" | "rolled" | "side" | "seat";

const TURN = Math.PI * 2;

/** Sat up off the back, a hand down beside the hip, legs drawn in. */
const SIT_UP = over(BASE, {
  pitch: -0.15, spineX: 0.45, neckX: -0.1,
  hipLX: -1.6, hipRX: -1.2, kneeL: 2.0, kneeR: 1.2, hipLZ: 0.3, hipRZ: 0.2,
  shLX: 0.5, shRX: -0.6, elL: -0.1, elR: -0.9, shLZ: 0.45, shRZ: 0.3,
});

/** The keys of a get up, `u` 0 to 1 through it, from `lying` with the barrel he ended at. */
function upKeys(lying: Lying, barrel: number): Keys {
  // A rolled body keeps rolling the way it went until it is face down, then rises.
  const whole = barrel / TURN;
  const turned = lying === "rolled" ? (barrel >= 0 ? Math.ceil(whole - 1e-6) : Math.floor(whole + 1e-6)) * TURN : lying === "side" ? Math.round(whole) * TURN : barrel;
  const at = (p: Pose) => over(p, { barrel: turned });
  if (lying === "back") return [[0.35, at(SIT_UP)], [0.68, at(KNEEL)], [1, at(BASE)]];
  if (lying === "seat") return [[0.4, at(KNEEL)], [1, at(BASE)]];
  if (lying === "front") return [[0.35, at(PUSH_UP)], [0.68, at(KNEEL)], [1, at(BASE)]];
  return [[0.25, at(PRONE)], [0.5, at(PUSH_UP)], [0.75, at(KNEEL)], [1, at(BASE)]];
}

/**
 * A whole time on the ground: the preset's own keys in seconds, held at
 * its last pose with a breath in it, then the get up to the feet.
 */
export function downAndUp(keys: Keys, lying: Lying, t: number, dur: number): Pose {
  const upAt = dur - TACKLE.getUp;
  const rest = keys[keys.length - 1]![1];
  if (t < upAt) return breathe(keyed(keys, t), t, keys[keys.length - 1]![0]);
  const u = (t - upAt) / TACKLE.getUp;
  return keyed([[0, rest], ...upKeys(lying, rest.barrel)], u);
}

/** Lying still after the fall, the chest still heaves and the head comes up. */
function breathe(p: Pose, t: number, settled: number): Pose {
  const k = Math.min(1, Math.max(0, (t - settled) / 0.3));
  if (k <= 0) return p;
  return over(p, { spineX: p.spineX + Math.sin(t * 5.5) * 0.03 * k, neckX: p.neckX - 0.15 * k });
}
