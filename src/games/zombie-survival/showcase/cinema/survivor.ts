import * as THREE from "three";
import { playerColor } from "@/games/kit/players";
import type { WeaponId } from "../../engine/weapons";
import { buildGun, type GunModel } from "../../render/models/guns";
import { limb } from "../../render/models/zombies/limbs";
import { Dresser, makeRig, type BodyDims, type Rig } from "../../render/models/zombies/rig";
import { cloth } from "../../render/surfaces";

const BUILD: BodyDims = {
  thigh: 0.44, shin: 0.43, foot: 0.08, torso: 0.58, torsoW: 0.4, torsoD: 0.24, shoulderW: 0.5, hipW: 0.22,
  upperArm: 0.3, forearm: 0.27, hand: 0.1, neck: 0.08, head: 0.26, arm: 0.11, leg: 0.15,
};

/** How one member of the team is kitted out. */
export interface Look {
  skin: number;
  jacket: number;
  headgear: "cap" | "helmet" | "bandana" | "hood";
}

export interface Survivor {
  rig: Rig;
  gun: GunModel;
  /** The player colour band on the arm and the gear, so each reads as a player. */
  seat: number;
}

type Mat = THREE.MeshStandardMaterial;
const std = (p: THREE.MeshStandardMaterialParameters): Mat => new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, ...p });

let shared: { denim: Mat; boot: Mat; strap: Mat; hair: Mat; eye: Mat; steel: Mat } | null = null;

function materials() {
  shared ??= {
    denim: std({ color: 0x2a3140, map: cloth() }),
    boot: std({ color: 0x2a1d14, roughness: 0.55 }),
    strap: std({ color: 0x1b1a17, roughness: 0.6 }),
    hair: std({ color: 0x17120e, roughness: 1 }),
    eye: std({ color: 0x0b0b0b, roughness: 0.3 }),
    steel: std({ color: 0x3a3f36, roughness: 0.45, metalness: 0.5 }),
  };
  return shared;
}

/**
 * One of the team as the trailer sees them from outside: a living body
 * on the zombies' skeleton, in a work jacket, jeans and boots, with a
 * vest in the player's colour and their gun from the game. The model
 * faces +z, like the dead.
 */
export function buildSurvivor(seat: number, look: Look, weapon: WeaponId): Survivor {
  const m = materials();
  const d = BUILD;
  const rig = makeRig(d);
  const dress = new Dresser(rig);
  const skin = std({ color: look.skin, roughness: 0.6 });
  const jacket = std({ color: look.jacket, map: cloth() });
  const team = std({ color: playerColor(seat), emissive: playerColor(seat), emissiveIntensity: 0.35, roughness: 0.5 });

  const head = dress.on("head");
  const h = d.head;
  head.sphere(h * 0.5, skin, [0, h * 0.62, -h * 0.02], [0.86, 1, 0.98], 16);
  head.sphere(h * 0.3, skin, [0, h * 0.34, h * 0.12], [1.05, 0.9, 1], 12);
  head.add(new THREE.ConeGeometry(h * 0.07, h * 0.18, 6), skin, [0, h * 0.5, h * 0.46], [0.3, 0, 0], [1, 1, 0.8]);
  for (const s of [-1, 1]) head.sphere(h * 0.045, m.eye, [s * h * 0.15, h * 0.6, h * 0.42], [1, 0.8, 0.6], 8);
  head.box(h * 0.5, h * 0.04, h * 0.05, m.hair, [0, h * 0.7, h * 0.44], [0.2, 0, 0]);
  gear(head, h, look.headgear, jacket, team, m);
  limb(dress.on("neck"), h * 0.2, h * 0.22, d.neck + 0.08, skin, d.neck + 0.05, 1, 10);

  const spine = dress.on("spine");
  spine.sphere(1, jacket, [0, d.torso * 0.64, 0], [d.torsoW * 0.52, d.torso * 0.4, d.torsoD * 0.54], 16);
  limb(spine, d.torsoW * 0.48, d.torsoW * 0.44, d.torso * 0.6, jacket, d.torso * 0.62, 0.62, 14);
  spine.sphere(1, jacket, [0, d.torso - d.arm * 0.4, 0], [d.shoulderW * 0.5, d.arm * 0.7, d.torsoD * 0.46], 12);
  // The vest in the player's colour, with pouches, and a pack on the back.
  spine.box(d.torsoW * 1.02, d.torso * 0.5, d.torsoD * 1.16, team, [0, d.torso * 0.56, 0], undefined, 0.05);
  for (let i = 0; i < 3; i++) spine.box(0.09, 0.1, 0.05, m.strap, [(i - 1) * 0.11, d.torso * 0.42, d.torsoD * 0.62], undefined, 0.015);
  spine.box(d.torsoW * 0.8, d.torso * 0.62, 0.16, m.strap, [0, d.torso * 0.56, -d.torsoD * 0.72], undefined, 0.05);
  const hips = dress.on("hips");
  limb(hips, d.torsoW * 0.44, d.torsoW * 0.46, 0.2, m.denim, 0.08, 0.64, 14);
  hips.box(d.torsoW * 0.94, 0.05, d.torsoD * 1.1, m.strap, [0, 0.04, 0], undefined, 0.02);

  for (const s of ["L", "R"] as const) {
    const up = dress.on(`shoulder${s}`);
    up.sphere(d.arm * 0.66, jacket, [0, -0.02, 0], [1, 1, 1], 10);
    limb(up, d.arm * 0.62, d.arm * 0.52, d.upperArm, jacket, 0, 1);
    up.add(new THREE.CylinderGeometry(d.arm * 0.64, d.arm * 0.64, 0.06, 12, 1, true), team, [0, -d.upperArm * 0.35, 0]);
    const fore = dress.on(`elbow${s}`);
    fore.sphere(d.arm * 0.52, jacket, [0, 0, 0], [1, 1, 1], 10);
    limb(fore, d.arm * 0.52, d.arm * 0.4, d.forearm, jacket, 0, 1);
    dress.on(`hand${s}`).sphere(d.arm * 0.46, m.strap, [0, -d.hand * 0.4, 0.01], [0.9, 1.3, 0.7], 10);
    const thigh = dress.on(`hip${s}`);
    thigh.sphere(d.leg * 0.6, m.denim, [0, -0.02, 0], [1, 1, 1], 10);
    limb(thigh, d.leg * 0.6, d.leg * 0.48, d.thigh + 0.02, m.denim, 0, 1);
    const shin = dress.on(`knee${s}`);
    shin.sphere(d.leg * 0.5, m.denim, [0, 0, 0], [1, 1, 1], 10);
    limb(shin, d.leg * 0.5, d.leg * 0.42, d.shin, m.denim, 0, 1);
    limb(shin, d.leg * 0.46, d.leg * 0.44, d.shin * 0.35, m.boot, -d.shin * 0.65, 1);
    dress.on(`ankle${s}`).sphere(1, m.boot, [0, -d.foot * 0.45, d.leg * 0.45], [d.leg * 0.52, d.foot * 0.7, d.leg * 1.05], 12);
  }
  dress.finish();

  const gun = buildGun(weapon);
  rig.bones.spine.add(gun.root);
  return { rig, gun, seat };
}

/** What each of the team wears on their head. */
function gear(b: ReturnType<Dresser["on"]>, h: number, kind: Look["headgear"], jacket: Mat, team: Mat, m: ReturnType<typeof materials>): void {
  if (kind === "helmet") {
    b.sphere(h * 0.56, m.steel, [0, h * 0.72, -h * 0.04], [0.95, 0.72, 1.05], 16);
    b.box(h * 1.1, h * 0.05, h * 1.2, m.steel, [0, h * 0.6, -h * 0.04], undefined, 0.02);
    return;
  }
  if (kind === "cap") {
    b.sphere(h * 0.53, team, [0, h * 0.72, -h * 0.03], [0.92, 0.7, 1], 14);
    b.box(h * 0.62, h * 0.04, h * 0.42, team, [0, h * 0.82, h * 0.48], [-0.12, 0, 0], 0.02);
    return;
  }
  if (kind === "hood") {
    b.sphere(h * 0.6, jacket, [0, h * 0.64, -h * 0.1], [0.95, 1.05, 1.02], 14);
    return;
  }
  b.sphere(h * 0.52, m.hair, [0, h * 0.7, -h * 0.06], [0.9, 0.86, 1], 14);
  b.add(new THREE.TorusGeometry(h * 0.44, h * 0.06, 6, 18), team, [0, h * 0.74, -h * 0.02], [Math.PI / 2 + 0.2, 0, 0]);
  // A bandana over the mouth, against the smell.
  b.sphere(h * 0.34, team, [0, h * 0.3, h * 0.14], [1.05, 0.72, 1], 12);
}
