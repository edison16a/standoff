import type * as THREE from "three";
import type { V3 } from "../geo";
import { WHITE_UV } from "../kit/atlas-layout";
import type { Finish } from "../kit/finish";
import { seg } from "../kit/detail";
import { part } from "../kit/part";
import { revolve } from "../kit/revolve";
import { pipe, sphere } from "../kit/shapes";

const plain = () => WHITE_UV;

/**
 * A mudguard arching over a wheel: a rounded shell turned round the
 * wheel's own axle, with a rolled lip and a dark underside, so it follows
 * the tyre the way a real one does. `arc` is from behind to in front of
 * the top, radians.
 */
export function fender(at: V3, radius: number, width: number, arc: readonly [number, number], color: string, finish: Finish = "metallic"): THREE.BufferGeometry[] {
  const hw = width / 2;
  const r = radius;
  const outer = revolve([
    { r: r - 0.01, x: hw + 0.01 },
    { r: r + 0.03, x: hw },
    { r: r + 0.06, x: hw * 0.6 },
    { r: r + 0.07, x: 0 },
    { r: r + 0.06, x: -hw * 0.6 },
    { r: r + 0.03, x: -hw },
    { r: r - 0.01, x: -hw - 0.01 },
  ], seg(28, 8), plain, arc);
  const inner = revolve([
    { r: r + 0.02, x: -hw },
    { r: r + 0.04, x: 0 },
    { r: r + 0.02, x: hw },
  ], seg(28, 8), plain, arc);
  return [part(outer, color, { finish, at }), part(inner, "#2a2a30", { finish: "plastic", at })];
}

/** A bent tube with a ball at each joint, for roll cages, bull bars and bumpers. */
export function tubing(points: readonly V3[], r: number, color: string, finish: Finish, joints = false): THREE.BufferGeometry[] {
  const parts = [part(pipe(points, r, Math.max(16, points.length * 10), 12), color, { finish })];
  if (joints) for (const p of [points[0]!, points[points.length - 1]!]) parts.push(part(sphere(r * 1.5, 12, 8), color, { finish, at: p }));
  return parts;
}
