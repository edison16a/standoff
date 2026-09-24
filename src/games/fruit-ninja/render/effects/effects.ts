import { Color, NormalBlending, type Scene } from "three";
import { BLADES, type BladeId } from "../../blades";
import { glowTexture, smokeTexture, sparkleTexture } from "../textures/sprites";
import { Confetti } from "./confetti";
import { Explosions } from "./explosion";
import { JuiceDrops } from "./juice";
import { Particles } from "./particles";
import { Stains } from "./stains";

const RAINBOW = ["#ff3b3b", "#ff9f1a", "#ffe14d", "#4dff6a", "#3ad7ff", "#7a5cff", "#ff4fd8"];
const GOLD = ["#fff6c0", "#ffd84a", "#ffb800", "#ffffff"];
/** Bombs leave a sooty mark on the wood. */
const SCORCH = new Color("#120a06");

/**
 * Every effect in the game behind one set of calls: juice, stains,
 * glitter, blade sparks, explosions and confetti, plus the screen shake
 * the renderer applies to the camera.
 */
export class Effects {
  readonly glow = new Particles(glowTexture(), 1800);
  readonly sparkle = new Particles(sparkleTexture(), 1600);
  readonly smoke = new Particles(smokeTexture(), 300, NormalBlending);
  readonly juice = new JuiceDrops();
  readonly stains: Stains;
  readonly explosions: Explosions;
  readonly confetti = new Confetti();
  /** Current shake strength in world units. It decays on its own. */
  shake = 0;

  constructor(scene: Scene) {
    scene.add(this.glow.points, this.sparkle.points, this.smoke.points, this.juice.mesh, this.confetti.mesh);
    this.stains = new Stains(scene);
    this.explosions = new Explosions(scene, this.glow, this.smoke, this.sparkle);
  }

  setScale(scale: number, distance: number): void {
    for (const system of [this.glow, this.sparkle, this.smoke]) system.setScale(scale, distance);
  }

  /** A clean cut: a spray of juice across the blade, a stain below and a pale mist. */
  slice(x: number, y: number, dir: { x: number; y: number }, color: Color, size: number): void {
    this.juice.burst(x, y, color, Math.round(18 + size * 16), 5 + size * 2, dir);
    this.stains.splat(x, y, color, 1.6 + size * 1.8);
    for (let i = 0; i < 8; i++) {
      this.glow.emit({ x, y, z: 0.4, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, life: 0.35, size: 0.6 + size * 0.4, grow: 2, drag: 4, color, alpha: 0.35 });
    }
  }

  /** A big fruit struck but still whole: a short spurt and a thud of glow. */
  hit(x: number, y: number, dir: { x: number; y: number }, color: Color): void {
    this.juice.burst(x, y, color, 14, 4, dir);
    this.glow.emit({ x, y, z: 0.8, vx: 0, vy: 0, life: 0.18, size: 2.2, color: "#ffffff", alpha: 0.6 });
    this.shake = Math.max(this.shake, 0.06);
  }

  /** A big fruit's last hit: juice everywhere and a big stain. */
  burst(x: number, y: number, color: Color, size: number): void {
    this.juice.burst(x, y, color, 90, 9, { x: 0, y: 0 });
    this.stains.splat(x, y, color, 3.5 + size * 1.5);
    this.stains.splat(x + (Math.random() - 0.5) * 2, y + (Math.random() - 0.5) * 2, color, 1.8);
    this.shake = Math.max(this.shake, 0.15);
  }

  /** Rare fruit: a ring of glitter and a flash, on top of the juice. */
  treasure(x: number, y: number, rainbow: boolean): void {
    const palette = rainbow ? RAINBOW : GOLD;
    this.glow.emit({ x, y, z: 1, vx: 0, vy: 0, life: 0.35, size: 6, color: rainbow ? "#ffffff" : "#fff2b0", grow: 1.5 });
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      this.sparkle.emit({
        x,
        y,
        z: 1,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0.8 + Math.random() * 0.9,
        size: 0.3 + Math.random() * 0.5,
        drag: 2.2,
        gravity: 1.5,
        color: palette[i % palette.length]!,
      });
    }
  }

  /** Glitter drifting off a rare fruit while it flies. */
  aura(x: number, y: number, radius: number, rainbow: boolean, time: number): void {
    const palette = rainbow ? RAINBOW : GOLD;
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * Math.PI * 2;
      this.sparkle.emit({
        x: x + Math.cos(a) * radius,
        y: y + Math.sin(a) * radius,
        z: 0.8,
        vx: Math.cos(a) * 0.6,
        vy: Math.sin(a) * 0.6 - 0.5,
        life: 0.6 + Math.random() * 0.4,
        size: 0.2 + Math.random() * 0.35,
        color: palette[Math.floor((time * 10 + i) % palette.length)]!,
      });
    }
  }

  /** Fizz from a bomb's fuse. */
  fuse(x: number, y: number, z: number): void {
    const a = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2.5;
    this.sparkle.emit({ x, y, z, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed + 0.5, life: 0.25 + Math.random() * 0.2, size: 0.18, gravity: 4, color: Math.random() < 0.5 ? "#ffd27a" : "#ffffff" });
  }

  bomb(x: number, y: number): void {
    this.explosions.blast(x, y);
    this.stains.splat(x, y, SCORCH, 3.2, 0.85);
    this.shake = Math.max(this.shake, 0.55);
  }

  /** Embers, snow, sparks or glitter thrown off a fast blade, in its style. */
  trail(x: number, y: number, blade: BladeId, speed: number): void {
    const look = BLADES[blade];
    const count = Math.min(3, Math.floor(speed / 10));
    for (let i = 0; i < count; i++) {
      const colour = look.motion === "spectrum" ? RAINBOW[Math.floor(Math.random() * RAINBOW.length)]! : Math.random() < 0.5 ? look.accent : look.glow;
      const falls = look.motion === "flame" ? -2.5 : look.motion === "shimmer" ? 1.2 : 3;
      const drip = blade === "venom" ? 6 : falls;
      this.sparkle.emit({
        x: x + (Math.random() - 0.5) * 0.2,
        y: y + (Math.random() - 0.5) * 0.2,
        z: 1.1,
        vx: (Math.random() - 0.5) * 2.4,
        vy: (Math.random() - 0.5) * 2.4,
        life: 0.35 + Math.random() * 0.4,
        size: look.motion === "bolt" ? 0.22 : 0.3,
        gravity: drip,
        drag: 1.5,
        color: colour,
      });
    }
  }

  update(dt: number, time: number): void {
    this.glow.update(dt);
    this.sparkle.update(dt);
    this.smoke.update(dt);
    this.juice.update(dt);
    this.stains.update(dt);
    this.explosions.update(dt);
    this.confetti.update(dt, time);
    this.shake = Math.max(0, this.shake - dt * 1.4);
  }

  clear(): void {
    for (const system of [this.glow, this.sparkle, this.smoke]) system.clear();
    this.juice.clear();
    this.explosions.clear();
  }
}
