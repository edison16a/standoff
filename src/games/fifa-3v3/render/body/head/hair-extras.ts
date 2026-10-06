import * as THREE from "three";
import type { Look } from "../../../looks";
import { join, place, roughen, tint } from "../parts";
import { sweep } from "../sweep";
import { aboveLine } from "./hairline";
import { sculpt } from "./sculpt";

/**
 * What a shell cannot grow: twists standing off the scalp with lighter
 * tips, a bun on the crown, tufts sticking up from a messy crop, and
 * the knobbly edge of curls against the sky.
 */

/** Spots spread evenly over the top of the head, from a golden angle spiral, in the head's units. */
function spots(count: number, reach: number): { at: THREE.Vector3; dir: THREE.Vector3 }[] {
  const out: { at: THREE.Vector3; dir: THREE.Vector3 }[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const polar = Math.acos(1 - t * reach);
    const around = i * 2.39996;
    const dir = new THREE.Vector3(Math.sin(polar) * Math.sin(around), Math.cos(polar), Math.sin(polar) * Math.cos(around)).normalize();
    out.push({ at: sculpt(dir, new THREE.Vector3()), dir });
  }
  return out;
}

function twists(look: Look, k: number, fine: boolean): THREE.BufferGeometry[] {
  const base = new THREE.Color(look.hair);
  const tip = base.clone().lerp(new THREE.Color("#d9a441"), 0.75);
  const out: THREE.BufferGeometry[] = [];
  for (const { at, dir } of spots(fine ? 34 : 16, 0.95)) {
    if (aboveLine(at, dir) < 0.004) continue;
    // Each twist leaves the scalp along it, then droops back and down under its own weight.
    const len = (0.05 + 0.02 * Math.abs(Math.sin(at.x * 300))) * k;
    const pts: THREE.Vector3[] = [];
    const d = dir.clone();
    const p = at.clone().multiplyScalar(k).addScaledVector(dir, 0.004 * k);
    for (let i = 0; i <= 4; i++) {
      pts.push(p.clone());
      d.add(new THREE.Vector3(0, -0.12, -0.08)).normalize();
      p.addScaledVector(d, len / 4);
    }
    const geo = sweep(pts, pts.map((_, i) => (0.0058 - 0.0012 * (i / 4)) * k), { n: fine ? 6 : 4, capEnd: true });
    const root = at.clone().multiplyScalar(k);
    out.push(tint(geo, (q, c) => c.copy(base).lerp(tip, Math.min(1, Math.max(0, (q.distanceTo(root) / len - 0.55) / 0.4)))));
  }
  return out;
}

function bun(look: Look, k: number, fine: boolean): THREE.BufferGeometry[] {
  const c = new THREE.Color(look.hair);
  const seg = fine ? 18 : 8;
  const ball = tint(place(new THREE.SphereGeometry(0.031 * k, seg, seg - 4), [0, 0.072 * k, -0.098 * k], [0.5, 0, 0], [1, 0.9, 1]), (p, out) =>
    out.copy(c).multiplyScalar(0.82 + 0.25 * Math.abs(Math.sin(p.x * 900 + p.y * 400))),
  );
  const band = tint(place(new THREE.TorusGeometry(0.019 * k, 0.0045 * k, 6, seg), [0, 0.066 * k, -0.08 * k], [0.95, 0, 0]), "#1b1b1f");
  return [ball, band];
}

function tufts(look: Look, k: number, fine: boolean): THREE.BufferGeometry[] {
  const c = new THREE.Color(look.hair);
  const out: THREE.BufferGeometry[] = [];
  for (const { at, dir } of spots(fine ? 22 : 10, 0.55)) {
    const len = 0.03 * k;
    const lean = dir.clone().add(new THREE.Vector3(0, 0.6, 0.35)).normalize();
    const root = at.clone().multiplyScalar(k).addScaledVector(dir, 0.012 * k);
    const pts = [root, root.clone().addScaledVector(lean, len * 0.5), root.clone().addScaledVector(lean, len)];
    out.push(tint(sweep(pts, [0.008 * k, 0.005 * k, 0.0015 * k], { n: fine ? 6 : 4 }), c.clone().multiplyScalar(1.08)));
  }
  return out;
}

/** Knobs of curl round the outline, so curly hair does not show a smooth cap against the light. */
function knobs(look: Look, k: number, fine: boolean, lift: number, size: number, reach: number): THREE.BufferGeometry[] {
  const c = new THREE.Color(look.hair);
  const out: THREE.BufferGeometry[] = [];
  spots(fine ? 70 : 24, reach).forEach(({ at, dir }, i) => {
    if (aboveLine(at, dir) < 0.008) return;
    const p = at.clone().multiplyScalar(k).addScaledVector(dir, lift * k);
    const shadeK = 0.85 + 0.12 * (i % 3);
    out.push(tint(place(new THREE.SphereGeometry(size * k, fine ? 7 : 5, fine ? 5 : 3), [p.x, p.y, p.z]), c.clone().multiplyScalar(shadeK)));
  });
  return out;
}

export function hairExtras(look: Look, k: number, fine: boolean): THREE.BufferGeometry[] {
  let parts: THREE.BufferGeometry[] = [];
  switch (look.hairStyle) {
    case "twists":
      parts = twists(look, k, fine);
      break;
    case "bun":
      parts = bun(look, k, fine);
      break;
    case "messy":
      parts = tufts(look, k, fine);
      break;
    case "afro":
      parts = knobs(look, k, fine, 0.044, 0.011, 0.95);
      break;
    case "curls":
      parts = knobs(look, k, fine, 0.016, 0.008, 0.95);
      break;
    case "curlytop":
      parts = knobs(look, k, fine, 0.016, 0.0075, 0.45);
      break;
    default:
      return [];
  }
  return parts.length ? [roughen(join(parts), 0.7)] : [];
}
