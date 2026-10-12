import * as THREE from "three";
import { flashTexture } from "../textures";
import { Particles } from "./particles";
import { SpritePool } from "./sprite-pool";

export type Impact = "flesh" | "armor" | "weak" | "world" | "none";

const SPARK = new THREE.Color(1, 0.72, 0.3);
const GOO = new THREE.Color(0.35, 0.95, 0.2);
const BLOOD = new THREE.Color(0.25, 0.5, 0.08);
const WEAK = new THREE.Color(1, 0.55, 0.15);
const DUST = new THREE.Color(0.45, 0.43, 0.4);
const FLASH: Record<Exclude<Impact, "none">, THREE.Color> = {
  flesh: new THREE.Color(0x9dff6a),
  weak: new THREE.Color(0xffc050),
  armor: new THREE.Color(0xffd9a0),
  world: new THREE.Color(0xffd9a0),
};
const UP = new THREE.Vector3(0, 1, 0);

/**
 * What a bullet does where it lands: sparks off stone and armour, green
 * goo from flesh, a burning orange spray from weak points, a puff of
 * dust off walls, and a flash sized to the distance so a far hit still
 * reads. The flashes share one pool, so no hit allocates a material.
 */
export class Impacts {
  readonly group = new THREE.Group();
  readonly sparks: Particles;
  private readonly goo: Particles;
  private readonly dust: Particles;
  private readonly flashes: SpritePool;

  constructor(
    private readonly random: () => number,
    low: boolean,
  ) {
    const n = low ? 0.4 : 1;
    this.sparks = new Particles(Math.round(700 * n), 0.09, true, 9, random);
    this.goo = new Particles(Math.round(600 * n), 0.13, false, 7, random);
    this.dust = new Particles(Math.round(500 * n), 1.6, false, -1.2, random);
    this.flashes = new SpritePool(48, flashTexture(), true);
    this.group.add(this.sparks.points, this.goo.points, this.dust.points, this.flashes.mesh);
  }

  /**
   * Where a bullet lands. Sparks and goo are small in the world, so a hit
   * twenty metres off also gets a flash sized to the distance from `eye`,
   * which reads on screen however far away it is.
   */
  impact(at: THREE.Vector3, normal: THREE.Vector3, kind: Impact, eye?: THREE.Vector3): void {
    if (kind === "none") return;
    if (eye) {
      const distance = at.distanceTo(eye);
      const size = Math.max(0.2, distance * (kind === "weak" ? 0.05 : 0.032));
      this.flashes.spawn(at, { size, grow: size, rotation: this.random() * Math.PI, colour: FLASH[kind], alpha: 1, life: kind === "weak" ? 0.1 : 0.07, frames: 1 });
    }
    if (kind === "flesh") {
      this.goo.burst(at, normal, 14, 3.2, 1.4, GOO, 0.7);
      this.goo.burst(at, normal, 6, 1.5, 1, BLOOD, 0.9);
    } else if (kind === "weak") {
      this.goo.burst(at, normal, 20, 4, 1.6, GOO, 0.8);
      this.sparks.burst(at, normal, 18, 5, 1.6, WEAK, 0.5);
    } else if (kind === "armor") {
      this.sparks.burst(at, normal, 16, 6, 1.4, SPARK, 0.35);
    } else {
      this.sparks.burst(at, normal, 9, 4.5, 1.2, SPARK, 0.3);
      this.dust.burst(at, normal, 2, 0.6, 0.6, DUST, 0.8);
    }
  }

  /** A bigger spray for a kill or a broken weak point. */
  splatter(at: THREE.Vector3, big: boolean): void {
    this.goo.burst(at, UP, big ? 60 : 24, big ? 5 : 3, 2, GOO, 1);
    if (big) this.sparks.burst(at, UP, 30, 6, 2, WEAK, 0.6);
  }

  update(dt: number): void {
    this.sparks.update(dt);
    this.goo.update(dt);
    this.dust.update(dt);
    this.flashes.update(dt);
  }

  dispose(): void {
    this.sparks.dispose();
    this.goo.dispose();
    this.dust.dispose();
    this.flashes.dispose();
  }
}
