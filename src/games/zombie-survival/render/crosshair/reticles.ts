import * as THREE from "three";
import { WEAPONS, type WeaponId } from "../../engine/weapons";
import { LINE, type Strokes } from "./strokes";

/** A gun's crosshair, built around its aim point in radians of view. */
export interface Reticle {
  group: THREE.Group;
  /** Opens the parts that show the cone to `cone` radians. */
  open(cone: number): void;
}

/** Four short lines pointing in at the aim from `from` to `to`, straight up, down and across. */
function ticks(s: Strokes, from: number, to: number): THREE.Group[] {
  return [0, 1, 2, 3].map((i) => {
    const a = (i * Math.PI) / 2;
    return s.bar(Math.cos(a) * from, Math.sin(a) * from, Math.cos(a) * to, Math.sin(a) * to);
  });
}

/**
 * The shotgun: a wide ring the size of its pellet cone, with four teeth
 * biting in, so a player sees at once how much of a far zombie it covers.
 */
function shotgun(s: Strokes): Reticle {
  const group = new THREE.Group();
  const cone = new THREE.Group();
  const r = WEAPONS.shotgun.spread;
  cone.add(s.ring(r), ...ticks(s, r - 0.012, r));
  group.add(cone, s.dot(0.0022));
  // Built at the gun's own cone, and stretched a touch as a blast goes off.
  return { group, open: (c) => cone.scale.setScalar(c / r) };
}

/** The submachine gun: four open ticks that sit on the edge of its spray. */
function smg(s: Strokes): Reticle {
  const group = new THREE.Group();
  const parts = ticks(s, 0, 0.014).map((t, i) => {
    const holder = new THREE.Group();
    holder.add(t);
    holder.userData.angle = (i * Math.PI) / 2;
    group.add(holder);
    return holder;
  });
  group.add(s.dot(0.002));
  const open = (c: number) => {
    for (const p of parts) p.position.set(Math.cos(p.userData.angle as number) * c, Math.sin(p.userData.angle as number) * c, 0);
  };
  return { group, open };
}

/** The rifle: a fine scope reticle, a small circle round a dot with ticks outside it. */
function rifle(s: Strokes): Reticle {
  const group = new THREE.Group();
  group.add(s.ring(0.009, LINE * 0.8), s.dot(0.0018), ...ticks(s, 0.015, 0.027));
  return { group, open: () => undefined };
}

/** The AK: a chevron whose tip is the aim, with a bar out to each side. */
function ak47(s: Strokes): Reticle {
  const group = new THREE.Group();
  group.add(s.bar(0, 0, -0.014, -0.019), s.bar(0, 0, 0.014, -0.019), s.bar(-0.044, 0, -0.026, 0), s.bar(0.026, 0, 0.044, 0), s.dot(0.0019));
  return { group, open: () => undefined };
}

const BUILD: Record<WeaponId, (s: Strokes) => Reticle> = { shotgun, smg, rifle, ak47 };

export function buildReticle(weapon: WeaponId, strokes: Strokes): Reticle {
  return BUILD[weapon](strokes);
}
