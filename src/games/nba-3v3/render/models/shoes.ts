import * as THREE from "three";
import type { Look } from "../../roster";
import { loft, ringZ, type Section } from "./loft";
import { join, place, roughen, tint } from "./parts";

/**
 * A high top basketball shoe in the ankle bone's frame, toe along +z,
 * the sole's underside at `-ankle`: a grippy outsole, a sculpted white
 * midsole thicker under the heel, a glossy upper that rises into a
 * padded collar round the ankle, a toe cap and heel counter a shade
 * darker, a sweeping accent panel down each side, laces across the
 * instep, the tongue and a pull tab at the heel.
 */

export interface ShoeSize {
  /** The ankle joint's height over the floor. */
  ankle: number;
  heel: number;
  toe: number;
  /** Width scale. */
  s: number;
}

const lerpKeys = (keys: readonly (readonly [number, number])[], u: number) => {
  let k = 0;
  while (k < keys.length - 2 && keys[k + 1]![0] < u) k++;
  const [u0, v0] = keys[k]!;
  const [u1, v1] = keys[k + 1]!;
  const t = Math.min(1, Math.max(0, (u - u0) / (u1 - u0)));
  return v0 + (v1 - v0) * t * t * (3 - 2 * t);
};

/** Half widths and heights along the shoe, heel (0) to toe (1), for a size of `s` 1. */
const WIDTH = [[0, 0.033], [0.15, 0.038], [0.38, 0.039], [0.62, 0.05], [0.82, 0.047], [0.95, 0.036], [1, 0.022]] as const;
const TOP = [[0, 0.118], [0.1, 0.15], [0.26, 0.152], [0.36, 0.13], [0.47, 0.105], [0.62, 0.083], [0.8, 0.066], [0.95, 0.05], [1, 0.034]] as const;
const MID = [[0, 0.036], [0.3, 0.034], [0.65, 0.026], [1, 0.024]] as const;

/** A foot shaped section: rounded at the toe of each corner, narrower over the instep than at the sole. */
function footSection(w: number, up: number, down: number, power: number): Section {
  const e = 2 / power;
  return (a) => {
    const s = Math.sin(a);
    const c = Math.cos(a);
    const width = w * (c > 0 ? 1 - 0.22 * c * c : 1);
    return [Math.sign(s) * Math.abs(s) ** e * width, Math.sign(c) * Math.abs(c) ** e * (c > 0 ? up : down)];
  };
}

/** How far each piece rounds off past the heel and the toe: the sole wraps up round the toe, the upper tucks into it. */
interface Ends {
  heel: number;
  toe: number;
}

/** A lofted slab or shell along the shoe, rounded off at the heel and the toe. */
function along(size: ShoeSize, n: number, rows: number, ends: Ends, section: (u: number) => { y: number; s: Section }): THREE.BufferGeometry {
  const { heel, toe } = size;
  const z = (u: number) => heel + (toe - heel) * u;
  const rings: THREE.Vector3[][] = [];
  const end = (u: number, k: number) => {
    const sec = section(u);
    return ringZ(0, sec.y, z(u), n, (a) => {
      const [x, y] = sec.s(a);
      return [x * k, y * k];
    });
  };
  const hz = ends.heel * size.s;
  const tz = ends.toe * size.s;
  for (const k of [0.45, 0.8, 0.96]) rings.push(end(0, k).map((p) => p.setZ(heel - hz * 0.92 * Math.sqrt(1 - k * k))));
  for (let i = 0; i <= rows; i++) rings.push(end(i / rows, 1));
  for (const k of [0.96, 0.8, 0.45]) rings.push(end(1, k).map((p) => p.setZ(toe + tz * 0.92 * Math.sqrt(1 - k * k))));
  return loft(rings, { start: new THREE.Vector3(0, section(0).y, heel - hz), end: new THREE.Vector3(0, section(1).y, toe + tz) });
}

export function buildShoe(look: Look, size: ShoeSize, fine: boolean): THREE.BufferGeometry {
  const { ankle: A, s, heel, toe } = size;
  const n = fine ? 18 : 10;
  const rows = fine ? 14 : 7;
  const u = (z: number) => (z - heel) / (toe - heel);
  const w = (v: number) => lerpKeys(WIDTH, v) * s;
  const mid = (v: number) => lerpKeys(MID, v) * s;
  const top = (v: number) => lerpKeys(TOP, v) * s;
  const midsoleColour = look.shoe.toLowerCase() === "#e5e7eb" ? look.shoeAccent : "#f1f0ec";

  const outsole = along(size, n, rows - 2, { heel: 0.013, toe: 0.018 }, (v) => ({ y: -A + 0.0045 * s, s: footSection(w(v) + 0.003 * s, 0.0045 * s, 0.0045 * s, 6) }));
  tint(outsole, "#262626");
  roughen(outsole, 0.85);
  const midsole = along(size, n, rows, { heel: 0.013, toe: 0.019 }, (v) => ({ y: -A + 0.009 * s + mid(v) / 2, s: footSection(w(v) + 0.004 * s, mid(v) / 2, mid(v) / 2, 5) }));
  tint(midsole, (p, c) => {
    // A thin accent line runs round the midsole just above the outsole.
    const line = Math.abs(p.y - (-A + 0.014 * s)) < 0.0018 * s;
    c.set(line ? look.shoeAccent : midsoleColour);
  });
  roughen(midsole, 0.62);

  const upperBase = -A + 0.02 * s;
  const upper = along(size, n + 4, rows + 4, { heel: 0.009, toe: 0.009 }, (v) => {
    const h = top(v) - 0.02 * s;
    return { y: upperBase + h * 0.45, s: footSection(w(v), h * 0.55, h * 0.45, 3.2) };
  });
  const body = new THREE.Color(look.shoe);
  const accent = new THREE.Color(look.shoeAccent);
  tint(upper, (p, c) => {
    const v = u(p.z);
    const h = p.y + A;
    c.copy(body);
    if (v < 0.2 && h < top(v) - 0.03 * s) c.multiplyScalar(0.82);
    if (v > 0.84) c.multiplyScalar(0.9);
    // The accent sweeps from low by the arch up and back to the collar, on both sides.
    const line = 0.03 * s + (0.62 - v) * 0.2 * s;
    const side = Math.abs(p.x) > w(v) * 0.55;
    if (side && v > 0.1 && v < 0.64 && Math.abs(h - line) < 0.011 * s) c.copy(accent);
    // A lining of accent shows at the collar's rim.
    if (v < 0.36 && h > top(v) - 0.006 * s) c.copy(accent).multiplyScalar(0.8);
  });
  roughen(upper, (p) => (u(p.z) > 0.84 ? 0.32 : 0.42));

  const parts = [outsole, midsole, upper];
  // A padded collar round the ankle opening.
  const collar = new THREE.TorusGeometry(0.039 * s, 0.011 * s, 6, fine ? 18 : 10);
  parts.push(roughen(tint(place(collar, [0, -A + top(0.2) - 0.012 * s, heel + (toe - heel) * 0.21], [Math.PI / 2 - 0.12, 0, 0], [1, 1.25, 1]), body.clone().multiplyScalar(0.8)), 0.7));
  // The tongue, rising at the front of the collar.
  parts.push(roughen(tint(place(new THREE.BoxGeometry(0.036 * s, 0.034 * s, 0.008 * s), [0, -A + top(0.36) + 0.004 * s, heel + (toe - heel) * 0.37], [-0.45, 0, 0]), body), 0.6));
  // Laces across the instep, following its slope.
  const lace = new THREE.Color(look.shoe.toLowerCase() === "#111111" || look.shoe.toLowerCase() === "#1d1d1f" ? "#e5e7eb" : look.shoeAccent);
  for (let i = 0; i < 6; i++) {
    const v = 0.4 + i * 0.045;
    const slope = Math.atan2(top(v + 0.02) - top(v - 0.02), (toe - heel) * 0.04);
    const bar = place(new THREE.BoxGeometry(0.03 * s, 0.0035 * s, 0.0075 * s), [0, -A + top(v) - 0.0005 * s, heel + (toe - heel) * v], [-slope, 0, 0]);
    parts.push(roughen(tint(bar, lace), 0.8));
  }
  // A pull tab at the top of the heel.
  parts.push(roughen(tint(place(new THREE.BoxGeometry(0.014 * s, 0.03 * s, 0.006 * s), [0, -A + top(0.05) - 0.002 * s, heel + 0.004 * s], [0.25, 0, 0]), accent), 0.6));
  return join(parts);
}
