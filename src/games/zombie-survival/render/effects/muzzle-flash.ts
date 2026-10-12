import * as THREE from "three";
import { flashTexture, glowTexture } from "../textures";
import { ringTexture } from "./effect-textures";
import type { FlashStyle } from "./flash-styles";
import { put, QuadBatch } from "./gpu/quad-batch";
import { STREAK_LAYOUT, streakMaterial, streakQuad, trackAspect } from "./gpu/streak-material";
import { SpritePool } from "./sprite-pool";

/** One tongue or petal of flame, kept for the frame or two it shows. */
interface Petal {
  head: THREE.Vector3;
  tail: THREE.Vector3;
  tip: number;
  base: number;
  colour: THREE.Color;
  frames: number;
}

const UP = new THREE.Vector3(0, 1, 0);
/** The bird cage's five slots, as angles from straight up. The bottom is solid so the flash does not kick up dust. */
const CAGE_SLOTS = [0, 1.05, -1.05, 2.1, -2.1];
const PETALS = 96;

/**
 * The flash at the muzzle: a star shaped core seen down the barrel, a
 * tongue of flame out of the bore, side petals from the flash hider, a
 * fireball on the big guns and a quick point light. It shows for one or
 * two frames, like a real flash caught by a camera's shutter, and its
 * shape and turn change every shot. Big guns also push out a faint ring
 * of overpressure that expands and thins in a tenth of a second.
 */
export class MuzzleFlash {
  readonly group = new THREE.Group();
  private readonly stars: SpritePool;
  private readonly balls: SpritePool;
  private readonly rings: SpritePool;
  private readonly flames: QuadBatch;
  private readonly petals: Petal[] = [];
  private next = 0;
  private readonly light = new THREE.PointLight(0xffb060, 0, 9, 1.6);
  private lightFrames = 0;
  private readonly u = new THREE.Vector3();
  private readonly v = new THREE.Vector3();
  private readonly radial = new THREE.Vector3();
  private readonly at = new THREE.Vector3();
  private readonly hot = new THREE.Color();
  private readonly outer = new THREE.Color();
  private readonly mix = new THREE.Color();

  constructor(private readonly random: () => number) {
    this.stars = new SpritePool(24, flashTexture(), true);
    this.balls = new SpritePool(12, glowTexture(), true);
    this.rings = new SpritePool(12, ringTexture(), false);
    const material = streakMaterial();
    this.flames = new QuadBatch(PETALS, STREAK_LAYOUT, material, streakQuad());
    trackAspect(this.flames.mesh, material);
    for (let i = 0; i < PETALS; i++) {
      this.petals.push({ head: new THREE.Vector3(), tail: new THREE.Vector3(), tip: 0, base: 0, colour: new THREE.Color(), frames: 0 });
    }
    this.group.add(this.stars.mesh, this.balls.mesh, this.flames.mesh, this.rings.mesh, this.light);
  }

  /** Fires one flash at the muzzle `at`, the barrel pointing along `dir`. `haze` tints the overpressure ring. */
  fire(at: THREE.Vector3, dir: THREE.Vector3, style: FlashStyle, haze: THREE.Color): void {
    const r = this.random;
    const frames = r() < 0.55 ? 2 : 1;
    this.hot.setHex(style.hot);
    this.outer.setHex(style.outer);
    this.basis(dir);

    this.at.copy(at).addScaledVector(dir, style.core * 0.25);
    this.stars.spawn(this.at, { size: style.core * (0.8 + r() * 0.45), grow: 0, rotation: r() * Math.PI * 2, colour: this.hot, alpha: 1, life: 0, frames });
    if (style.ball > 0) {
      this.at.copy(at).addScaledVector(dir, style.ball * 0.45);
      const size = style.ball * (0.85 + r() * 0.35);
      this.balls.spawn(this.at, { size, grow: size, rotation: r() * Math.PI * 2, colour: this.outer, alpha: 0.85, life: 0, frames });
    }
    // The tongue straight out of the bore, its length different each shot.
    this.petal(at, dir, style.tongue * (0.7 + r() * 0.6), style.tongueWidth * 0.3, style.tongueWidth, this.hot, frames);
    const spin = r() * Math.PI * 2;
    for (let k = 0; k < style.petals; k++) {
      const angle = style.closedBelow ? CAGE_SLOTS[k % CAGE_SLOTS.length]! + (r() - 0.5) * 0.15 : spin + (k / style.petals) * Math.PI * 2 + (r() - 0.5) * 0.6;
      this.radial.copy(this.v).multiplyScalar(Math.cos(angle)).addScaledVector(this.u, Math.sin(angle));
      this.radial.multiplyScalar(1 - style.petalLean).addScaledVector(dir, style.petalLean).normalize();
      const [lo, hi] = style.petalLength;
      const colour = this.mix.copy(this.hot).lerp(this.outer, 0.3 + r() * 0.6);
      this.petal(at, this.radial, lo + (hi - lo) * r(), style.petalWidth * 0.2, style.petalWidth, colour, frames);
    }

    this.light.position.copy(at).addScaledVector(dir, 0.12);
    this.light.color.copy(this.outer).lerp(this.hot, 0.5);
    this.light.intensity = Math.max(this.light.intensity, style.light * (0.85 + r() * 0.3));
    this.lightFrames = Math.max(this.lightFrames, frames);

    if (style.blast > 0) {
      this.at.copy(at).addScaledVector(dir, 0.08);
      this.rings.spawn(this.at, { size: 0.06, grow: style.blast * (0.85 + r() * 0.3), rotation: r() * Math.PI * 2, colour: haze, alpha: 0.32, life: 0.13 });
    }
  }

  update(dt: number): void {
    this.stars.update(dt);
    this.balls.update(dt);
    this.rings.update(dt);
    // The light, like the flash, gets its frames on screen and then goes out.
    if (this.lightFrames > 0) this.lightFrames -= 1;
    else this.light.intensity = 0;
    const { aHead, aTail, aWidth, aColor, aShape } = this.flames.data as Record<keyof typeof STREAK_LAYOUT, Float32Array>;
    this.flames.begin();
    for (const p of this.petals) {
      if (p.frames <= 0) continue;
      p.frames -= 1;
      const i = this.flames.take();
      if (i < 0) break;
      put(aHead, 3, i, p.head.x, p.head.y, p.head.z);
      put(aTail, 3, i, p.tail.x, p.tail.y, p.tail.z);
      put(aWidth, 2, i, p.tip, p.base);
      put(aColor, 4, i, p.colour.r, p.colour.g, p.colour.b, 1);
      // Brightest at the base where the gas is hottest, a soft glow around it.
      put(aShape, 2, i, 0.55, -1.3);
    }
    this.flames.end();
  }

  dispose(): void {
    this.stars.dispose();
    this.balls.dispose();
    this.rings.dispose();
    this.flames.dispose();
  }

  private petal(from: THREE.Vector3, dir: THREE.Vector3, length: number, tip: number, base: number, colour: THREE.Color, frames: number): void {
    const p = this.petals[this.next]!;
    this.next = (this.next + 1) % this.petals.length;
    p.tail.copy(from);
    p.head.copy(from).addScaledVector(dir, length);
    p.tip = tip;
    p.base = base;
    p.colour.copy(colour);
    p.frames = frames;
  }

  /** Two directions square to the barrel: `u` to its right and `v` above it. */
  private basis(dir: THREE.Vector3): void {
    this.u.crossVectors(dir, UP);
    if (this.u.lengthSq() < 1e-6) this.u.set(1, 0, 0);
    this.u.normalize();
    this.v.crossVectors(this.u, dir).normalize();
  }
}
