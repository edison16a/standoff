import * as THREE from "three";
import type { GunId } from "../../engine/guns";
import type { GunModel } from "../models/guns";
import type { Rig } from "../models/rig";
import { kick, smooth, type P3 } from "./curves";
import type { GunAction, HandTarget } from "./gun-actions";
import type { Celebration } from "./victory";

/** How hard each gun kicks back into the shoulder and up, and how fast it settles. */
const RECOIL: Record<GunId, { back: number; rise: number; settle: number }> = {
  rifle: { back: 0.028, rise: 0.05, settle: 0.07 },
  smg: { back: 0.018, rise: 0.035, settle: 0.05 },
  shotgun: { back: 0.075, rise: 0.2, settle: 0.15 },
  sniper: { back: 0.085, rise: 0.22, settle: 0.2 },
};

const e = new THREE.Euler();
const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();
const va = new THREE.Vector3();
const vb = new THREE.Vector3();

/** A point on a joint's frame, in the fighter root's space. */
export function toRoot(rig: Rig, joint: THREE.Object3D, p: P3, out = new THREE.Vector3()): THREE.Vector3 {
  out.set(p[0], p[1], p[2]);
  joint.localToWorld(out);
  return rig.root.worldToLocal(out);
}

export interface HoldInput {
  gun: GunId;
  aimYaw: number;
  aimPitch: number;
  raise: number;
  /** Seconds since the last shot. */
  sinceShot: number;
  action: GunAction;
  party: Celebration | null;
}

/**
 * Where the gun sits in the fighter root's space. Aiming, the stock goes
 * into the right shoulder and the barrel runs along the aim; carried, it
 * points down and across the body. Recoil, reload tilts and a
 * celebration are laid on top.
 */
export function holdGun(rig: Rig, gun: GunModel, h: HoldInput, pos: THREE.Vector3, quat: THREE.Quaternion): void {
  const s = rig.size.s;
  const aimQ = qa.setFromEuler(e.set(-h.aimPitch, h.aimYaw, 0, "YXZ"));
  // The shoulder pocket: the front of the right shoulder, where the stock sits.
  const pocket = toRoot(rig, rig.chest, [-0.08 * s, 0.2 * s, 0.14 * s], va);
  const aimPos = vb.copy(gun.butt).applyQuaternion(aimQ).negate().add(pocket);
  // Low ready: the stock under the right arm, the muzzle down and a little across the body.
  const lowQ = qb.setFromEuler(e.set(0.6, 0.32 + h.aimYaw * 0.3, -0.2, "YXZ"));
  const lowPos = toRoot(rig, rig.chest, [-0.07 * s, -0.04 * s, 0.25 * s], pos);
  const r = smooth(h.raise);
  pos.lerpVectors(lowPos, aimPos, r);
  quat.slerpQuaternions(lowQ, aimQ, r);
  if (h.party && h.party.gunUp > 0) {
    const up = h.party.across
      ? { at: [-0.24 * s, 0.6 * s, 0.08 * s] as P3, q: qa.setFromEuler(e.set(0, Math.PI / 2, -0.1, "YXZ")) }
      : { at: [-0.2 * s, 0.66 * s, 0.14 * s] as P3, q: qa.setFromEuler(e.set(-1.2, 0.35, 0, "YXZ")) };
    pos.lerp(toRoot(rig, rig.chest, up.at, vb), h.party.gunUp);
    quat.slerp(up.q, h.party.gunUp);
  }
  const a = h.action;
  quat.multiply(qb.setFromEuler(e.set(-a.lift, 0, a.roll)));
  const rc = RECOIL[h.gun];
  const k = kick(h.sinceShot, 0.025, rc.settle);
  pos.add(va.set(0, 0, -rc.back * k).applyQuaternion(quat));
  quat.multiply(qb.setFromEuler(e.set(-rc.rise * k, 0, 0)));
}

/** A hand target in the root's space, or null to keep the grip. */
export function handPoint(rig: Rig, t: HandTarget | null, gunPos: THREE.Vector3, gunQuat: THREE.Quaternion, out: THREE.Vector3): THREE.Vector3 | null {
  if (!t) return null;
  if (t.space === "gun") return out.set(t.at[0], t.at[1], t.at[2]).applyQuaternion(gunQuat).add(gunPos);
  return toRoot(rig, t.space === "chest" ? rig.chest : rig.pelvis, [t.at[0] * rig.size.s, t.at[1] * rig.size.s, t.at[2] * rig.size.s], out);
}
