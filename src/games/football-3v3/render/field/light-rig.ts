import * as THREE from "three";
import { angleAtX, BOWL, ring, ROOF } from "./bowl";

/** A bank of floodlights hung under the roof's inner edge: rows by columns of lamp heads, all aimed at the field. */
export interface Bank {
  centre: THREE.Vector3;
  /** Along the bank, level. */
  along: THREE.Vector3;
  /** Where its lamps point, on the turf. */
  aim: THREE.Vector3;
  cols: number;
  rows: number;
}

/** Lamp heads are this far apart in a bank. */
export const LAMP_PITCH = 0.95;

/** Along each sideline, where the banks hang, by x. */
const SIDE_X = [-54, -27, 0, 27, 54];
/** Across each end, by z. */
const END_Z = [-15, 15];

function bankAt(t: number, aimX: number, aimZ: number, cols: number): Bank {
  const centre = ring(t, ROOF.inner + 1.2, ROOF.y - ROOF.thickness - 1.6);
  const step = ring(t + 0.01, ROOF.inner + 1.2, centre.y);
  const along = step.sub(centre).setY(0).normalize();
  return { centre, along, aim: new THREE.Vector3(aimX, 0, aimZ), cols, rows: 4 };
}

/**
 * Every floodlight bank in the stadium: five along the inner edge of the
 * roof over each sideline and two over each end. The renderer's key
 * lights, the reflections in the helmets and the glare all come from
 * these same banks, so the light on the players matches what the camera
 * sees overhead.
 */
export function banks(): Bank[] {
  const out: Bank[] = [];
  for (const sign of [1, -1] as const) {
    for (const x of SIDE_X) out.push(bankAt(angleAtX(x, sign), x * 0.75, -sign * 6, 16));
  }
  for (const sx of [1, -1] as const) {
    for (const z of END_Z) {
      // On the superellipse sin(t) is (z / b) to the power n / 2.
      const s = Math.sign(z) * Math.abs(z / BOWL.b) ** (BOWL.n / 2);
      const t = sx > 0 ? Math.asin(s) : Math.PI - Math.asin(s);
      out.push(bankAt(t, sx * 30, z * 0.5, 12));
    }
  }
  return out;
}

/** Where each lamp head in a bank sits, and the unit direction it shines. */
export function lamps(bank: Bank): { at: THREE.Vector3; dir: THREE.Vector3 }[] {
  const out: { at: THREE.Vector3; dir: THREE.Vector3 }[] = [];
  const inward = bank.aim.clone().sub(bank.centre).setY(0).normalize();
  for (let r = 0; r < bank.rows; r++) {
    for (let c = 0; c < bank.cols; c++) {
      const at = bank.centre.clone().addScaledVector(bank.along, (c - (bank.cols - 1) / 2) * LAMP_PITCH);
      at.y += (r - (bank.rows - 1) / 2) * LAMP_PITCH * 0.9;
      // Each lamp aims at its own spot, spread round the bank's aim, so the field is lit evenly.
      const spot = bank.aim.clone().addScaledVector(bank.along, (c - (bank.cols - 1) / 2) * 2.2);
      spot.addScaledVector(inward, (r - (bank.rows - 1) / 2) * 6);
      out.push({ at, dir: spot.sub(at).normalize() });
    }
  }
  return out;
}

/**
 * The two key lights' directions, toward the light: one from the banks
 * over the near sideline and one from over the far one. Both come from a
 * little toward one end, so a player's two shadows fan out the way they
 * do under real floodlights instead of lying on one line.
 */
export const KEY_FROM = new THREE.Vector3(-0.32, 0.72, 0.62).normalize();
export const COUNTER_FROM = new THREE.Vector3(0.38, 0.7, -0.6).normalize();
