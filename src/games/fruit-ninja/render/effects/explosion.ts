import { AdditiveBlending, Color, Mesh, MeshBasicMaterial, PlaneGeometry, PointLight, type Scene } from "three";
import { ringTexture } from "../textures/blast";
import type { Particles } from "./particles";
import { Shards } from "./shards";

/**
 * Fire runs from white hot at the heart, through yellow and orange, to a
 * sooty red as it cools. The hot end is brighter than white, so the glow
 * pass catches it and the fireball shines rather than just being orange.
 */
const HOT = ["#ffd35a", "#ffaa2a", "#ff8418"].map((c) => new Color(c).multiplyScalar(1.5));
const COOL = ["#c8380c", "#8a220a", "#3a160c"].map((c) => new Color(c));
const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]!;

/**
 * A bomb going off: a white flash that lights the whole board, a rolling
 * fireball that cools from white to red and turns to smoke, a shockwave,
 * sparks and embers, and black shell shards. Everything is drawn on
 * camera facing quads with soft edges, so it looks the same at any
 * resolution and on any graphics card.
 */
export class Explosions {
  private readonly light = new PointLight(0xffb060, 0, 30, 1.6);
  private readonly ring: Mesh;
  private readonly ringMaterial: MeshBasicMaterial;
  private readonly shards = new Shards();
  private ringAge = 99;
  private lightAge = 99;

  constructor(
    private readonly scene: Scene,
    private readonly glow: Particles,
    private readonly smoke: Particles,
    private readonly sparks: Particles,
  ) {
    this.light.position.z = 2;
    scene.add(this.light);
    this.ringMaterial = new MeshBasicMaterial({ map: ringTexture(), color: new Color("#ffc680"), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
    this.ring = new Mesh(new PlaneGeometry(2, 2), this.ringMaterial);
    this.ring.renderOrder = 15;
    this.ring.visible = false;
    scene.add(this.ring);
    scene.add(this.shards.mesh);
  }

  blast(x: number, y: number): void {
    this.light.position.set(x, y, 2);
    this.lightAge = 0;
    this.ring.position.set(x, y, 0.3);
    this.ring.visible = true;
    this.ringAge = 0;
    this.smokeColumn(x, y);
    this.fireball(x, y);
    // The flash: a white hot core and a wide warm bloom around it.
    this.glow.emit({ x, y, z: 1.4, vx: 0, vy: 0, life: 0.16, size: 2.6, grow: 1.8, color: "#ffffff" });
    this.glow.emit({ x, y, z: 1.3, vx: 0, vy: 0, life: 0.35, size: 5.5, grow: 1.3, color: "#ff9a3a", alpha: 0.45 });
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 7 + Math.random() * 12;
      this.sparks.emit({ x, y, z: 0.9, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 0.35 + Math.random() * 0.45, size: 0.3, grow: 0.3, drag: 2.2, gravity: 7, color: "#fff0b0", to: "#ff5a14" });
    }
    // Embers drift up out of the smoke for a while after.
    for (let i = 0; i < 28; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3.5;
      this.glow.emit({
        x: x + Math.cos(a) * 0.4,
        y: y + Math.sin(a) * 0.4,
        z: 1,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed + 1,
        life: 0.9 + Math.random() * 1.2,
        size: 0.12 + Math.random() * 0.14,
        drag: 1.6,
        gravity: -1.2,
        delay: Math.random() * 0.25,
        color: "#ffd27a",
        to: "#ff3a0a",
      });
    }
    this.shards.throw(x, y, 26);
  }

  /** Soot that rises and spreads once the fire has burnt out. Emitted first, so the fire draws over it. */
  private smokeColumn(x: number, y: number): void {
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2.2;
      this.smoke.emit({
        x: x + Math.cos(a) * 0.5,
        y: y + Math.sin(a) * 0.5,
        z: 0.4,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed + 0.6,
        life: 1.6 + Math.random() * 1.2,
        size: 1.3 + Math.random() * 1.2,
        grow: 2.3,
        drag: 1.3,
        gravity: -0.7,
        spin: (Math.random() - 0.5) * 1.2,
        delay: 0.1 + Math.random() * 0.25,
        hold: 0.3,
        alpha: 0.7,
        color: "#4e443d",
        to: "#26201c",
      });
    }
  }

  /** Rolling puffs, normal blended so the orange stays orange over pale wood, with an additive glow inside. */
  private fireball(x: number, y: number): void {
    for (let i = 0; i < 44; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 5;
      this.smoke.emit({
        x,
        y,
        z: 0.9,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0.55 + Math.random() * 0.45,
        size: 1.1 + Math.random() * 1,
        grow: 2.2,
        drag: 3.6,
        hold: 0.35,
        gravity: -1.4,
        spin: (Math.random() - 0.5) * 3,
        color: pick(HOT),
        to: pick(COOL),
      });
    }
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.glow.emit({ x, y, z: 0.6, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 0.3 + Math.random() * 0.2, size: 1.6, grow: 1.8, drag: 4, color: "#ff7a1a", alpha: 0.5 });
    }
  }

  update(dt: number): void {
    this.lightAge += dt;
    this.light.intensity = this.lightAge < 0.7 ? 160 * Math.exp(-this.lightAge * 8) : 0;
    this.ringAge += dt;
    const k = Math.min(1, this.ringAge / 0.5);
    // Fast out, easing off, like a pressure wave losing strength.
    this.ring.scale.setScalar(0.4 + (1 - (1 - k) ** 3) * 3.6);
    this.ringMaterial.opacity = (1 - k) * (1 - k) * 0.7;
    this.ring.visible = k < 1;

    this.shards.update(dt);
  }

  clear(): void {
    this.shards.clear();
    this.ringAge = this.lightAge = 99;
    this.ring.visible = false;
    this.light.intensity = 0;
  }

  dispose(): void {
    this.scene.remove(this.light, this.ring, this.shards.mesh);
    this.ring.geometry.dispose();
    this.ringMaterial.dispose();
    this.shards.dispose();
  }
}
