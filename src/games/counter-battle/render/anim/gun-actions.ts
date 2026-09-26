import type { GunId } from "../../engine/guns";
import { track, track3, type P3 } from "./curves";

/** A hand target: a point on the gun, on the chest (a pouch) or on the hips (the shell belt). */
export interface HandTarget {
  space: "gun" | "chest" | "hips";
  at: P3;
}

/** Points on a gun model the hands work, in the gun's space. */
export interface GunPoints {
  fore: P3;
  handle: P3;
  magHome: P3;
}

/**
 * What the hands and the gun's moving parts are doing on top of the
 * plain hold: reloading, racking the pump or working the bolt. A hand
 * with no target holds its grip. Targets can jump from one place to the
 * next: the animator glides the hand across, so a keyframe only says
 * where the hand should be, not how it gets there.
 */
export interface GunAction {
  roll: number;
  lift: number;
  left: HandTarget | null;
  right: HandTarget | null;
  /** How far the magazine has slid out of its well (down, in metres). */
  magOut: number;
  /** The magazine rides in the left hand instead of the gun. */
  magInHand: boolean;
  /** Between dropping the old magazine and taking the new one, there is none to show. */
  magHidden: boolean;
  bolt: number;
  boltUp: number;
  pump: number;
  shellInHand: boolean;
}

export function idleAction(): GunAction {
  return { roll: 0, lift: 0, left: null, right: null, magOut: 0, magInHand: false, magHidden: false, bolt: 0, boltUp: 0, pump: 0, shellInHand: false };
}

/** A magazine pouch on the front left of the chest. */
const POUCH: P3 = [0.07, 0.04, 0.21];
/** The shell loops on the left hip. */
const BELT: P3 = [0.18, -0.02, 0.1];
/** Where the old magazine is let go, in a reload's share: the view drops a loose one here. */
export const MAG_DROP_AT = 0.3;

/** A magazine change, as a share `p` of the reload from 0 to 1 (rifle and SMG). */
function magChange(p: number, g: GunPoints, charge: boolean): GunAction {
  const a = idleAction();
  const [mx, my, mz] = g.magHome;
  const onMag: P3 = [mx + 0.03, my - 0.07, mz];
  const under: P3 = [mx + 0.03, my - 0.21, mz];
  a.roll = track(p, [[0, 0], [0.1, 0.55], [0.86, 0.5], [1, 0]]);
  a.lift = track(p, [[0, 0], [0.1, 0.18], [0.86, 0.14], [1, 0]]);
  a.magOut = track(p, [[0.1, 0], [0.26, 0.14], [0.56, 0.14], [0.68, 0]]);
  a.magInHand = (p > 0.12 && p < MAG_DROP_AT) || (p >= 0.42 && p < 0.64);
  a.magHidden = p >= MAG_DROP_AT && p < 0.42;
  if (p < 0.08) a.left = null;
  else if (p < MAG_DROP_AT) a.left = { space: "gun", at: track3(p, [[0.1, onMag], [0.26, under]]) };
  else if (p < 0.52) a.left = { space: "chest", at: POUCH };
  else if (p < 0.78) a.left = { space: "gun", at: track3(p, [[0.52, under], [0.64, under], [0.68, onMag], [0.72, [mx + 0.03, my - 0.05, mz]], [0.76, onMag]]) };
  else if (charge && p < 0.92) a.left = { space: "gun", at: g.handle };
  if (charge) a.bolt = track(p, [[0.84, 0], [0.87, 1], [0.9, 0]]);
  return a;
}

/** The shotgun loads a shell every cycle: `q` is the share of the current shell's cycle. */
function shellLoad(q: number): GunAction {
  const a = idleAction();
  a.roll = 0.7;
  a.lift = 0.12;
  a.left = q < 0.35 ? { space: "hips", at: BELT } : { space: "gun", at: track3(q, [[0.35, [0.02, -0.09, 0.12]], [0.75, [0.02, -0.09, 0.12]], [0.88, [0.0, -0.04, 0.07]], [1, [0.02, -0.09, 0.12]]]) };
  a.shellInHand = q > 0.3 && q < 0.88;
  return a;
}

/** The sniper: bolt open, magazine out and in, bolt closed. */
function boltReload(p: number, g: GunPoints): GunAction {
  const a = magChange((p - 0.12) / 0.66, g, false);
  a.roll = track(p, [[0, 0], [0.14, 0.3], [0.8, 0.3], [1, 0]]);
  if (p < 0.12 || p > 0.78) a.left = null;
  const working = (p > 0.03 && p < 0.18) || (p > 0.76 && p < 0.92);
  a.right = working ? { space: "gun", at: g.handle } : null;
  a.boltUp = track(p, [[0.06, 0], [0.09, 1], [0.84, 1], [0.88, 0]]);
  a.bolt = track(p, [[0.09, 0], [0.14, 1], [0.8, 1], [0.84, 0]]);
  return a;
}

/** Reload progress to hands and parts, for each gun. `shellQ` is the shotgun's cycle within a shell. */
export function reloadAction(gun: GunId, p: number, g: GunPoints, shellQ: number): GunAction {
  if (gun === "shotgun") return shellLoad(shellQ);
  if (gun === "sniper") return boltReload(p, g);
  return magChange(p, g, gun === "rifle");
}

/**
 * After a shot: the shotgun's pump racks back and forward, the sniper's
 * bolt is worked by the right hand. `t` is seconds since the shot.
 */
export function afterShot(gun: GunId, t: number, g: GunPoints): GunAction | null {
  if (gun === "shotgun" && t < 0.5) {
    const a = idleAction();
    a.pump = track(t, [[0.1, 0], [0.22, 1], [0.36, 0]]);
    return a;
  }
  if (gun === "sniper" && t > 0.3 && t < 1.05) {
    const a = idleAction();
    a.right = t > 0.34 && t < 0.92 ? { space: "gun", at: g.handle } : null;
    a.boltUp = track(t, [[0.45, 0], [0.52, 1], [0.76, 1], [0.84, 0]]);
    a.bolt = track(t, [[0.52, 0], [0.62, 1], [0.68, 1], [0.76, 0]]);
    a.lift = track(t, [[0.3, 0], [0.5, 0.06], [0.9, 0.06], [1.05, 0]]);
    return a;
  }
  return null;
}
