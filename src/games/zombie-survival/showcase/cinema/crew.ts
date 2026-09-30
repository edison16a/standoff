import * as THREE from "three";
import type { WeaponId } from "../../engine/weapons";
import { buildSurvivor, type Look, type Survivor } from "./survivor";
import { poseSurvivor, type Stance } from "./survivor-pose";
import { BED } from "./truck";

interface Berth {
  seat: number;
  weapon: WeaponId;
  look: Look;
  stance: Stance;
  /** Where they stand in the bed, in the truck's frame. */
  x: number;
  z: number;
}

/** The team as the game fields it: shotgun, submachine gun, rifle and AK, one per player colour. */
const BERTHS: readonly Berth[] = [
  { seat: 1, weapon: "shotgun", look: { skin: 0xc68e6c, jacket: 0x3b3129, headgear: "bandana" }, stance: "kneel", x: -0.42, z: 2.05 },
  { seat: 2, weapon: "smg", look: { skin: 0x8a5a3e, jacket: 0x24303a, headgear: "cap" }, stance: "kneel", x: 0.44, z: 2.1 },
  { seat: 3, weapon: "rifle", look: { skin: 0xe2b394, jacket: 0x33382c, headgear: "helmet" }, stance: "stand", x: -0.46, z: 1.0 },
  { seat: 4, weapon: "ak47", look: { skin: 0x6a4630, jacket: 0x2e2a30, headgear: "hood" }, stance: "stand", x: 0.5, z: 0.95 },
];

/** Seconds a shot's kick takes to settle, and how far the aim may swing off straight back. */
const SETTLE = 0.16;
const MAX_YAW = 1.1;

const local = new THREE.Vector3();

/**
 * The four of the team riding in the truck's bed, facing back down the
 * road. Each turns to the chaser they are on and kicks with each shot.
 */
export class Crew {
  readonly members: Survivor[];
  private readonly berths = new Map<number, Berth>();

  constructor(bed: THREE.Object3D) {
    this.members = BERTHS.map((berth) => {
      const who = buildSurvivor(berth.seat, berth.look, berth.weapon);
      who.rig.root.position.set(berth.x, BED.floor + 0.03, berth.z);
      bed.add(who.rig.root);
      this.berths.set(berth.seat, berth);
      return who;
    });
  }

  /**
   * Poses everyone at story time `s`. `aimAt` gives the world point each
   * seat is on, and `lastShot` the story time of its latest shot.
   */
  update(s: number, aimAt: (seat: number) => THREE.Vector3 | null, lastShot: (seat: number) => number): void {
    for (const who of this.members) {
      const berth = this.berths.get(who.seat)!;
      const root = who.rig.root;
      const target = aimAt(who.seat);
      let yaw = 0;
      let pitch = -0.05;
      if (target && root.parent) {
        root.parent.worldToLocal(local.copy(target));
        const dx = local.x - berth.x;
        const dz = local.z - berth.z;
        const dy = local.y - (BED.floor + (berth.stance === "kneel" ? 1.0 : 1.4));
        yaw = Math.max(-MAX_YAW, Math.min(MAX_YAW, Math.atan2(dx, dz)));
        pitch = Math.atan2(dy, Math.hypot(dx, dz));
      }
      const since = s - lastShot(who.seat);
      const kick = since >= 0 && since < SETTLE * 3 ? Math.exp(-since / SETTLE) : 0;
      poseSurvivor(who, { stance: berth.stance, yaw, pitch, kick, time: s });
    }
  }

  /** Where a seat's muzzle is and which way it points, in the world. */
  muzzle(seat: number, at: THREE.Vector3, dir: THREE.Vector3): boolean {
    const who = this.members.find((m) => m.seat === seat);
    if (!who) return false;
    who.gun.muzzle.getWorldPosition(at);
    who.gun.root.getWorldDirection(dir);
    // Guns are modelled pointing down -z, the other way from what getWorldDirection gives.
    dir.negate();
    return true;
  }

  weapon(seat: number): WeaponId {
    return this.berths.get(seat)?.weapon ?? "rifle";
  }

  dispose(): void {
    for (const who of this.members) {
      who.rig.root.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        o.geometry.dispose();
      });
    }
  }
}
