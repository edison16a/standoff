import * as THREE from "three";
import type { RunEvent } from "../../engine/events";
import type { Run } from "../../engine/run";
import { hash } from "../../engine/rng";
import { POWER_COLORS } from "../models/pickups";
import { glowTexture, sparkTexture } from "../textures";
import { Particles } from "./particles";

const CONFETTI = [0xff4d5e, 0xffb347, 0xffe14d, 0x6cf08a, 0x5fd8ff, 0xc77dff];

/**
 * The sparkle of one run: coin twinkles, dust from feet, crash sparks,
 * power up bursts and confetti on a new zone. Randomness comes from a
 * counter through a hash, so the showcase plays out the same every time.
 */
export class RunEffects {
  readonly group = new THREE.Group();
  private readonly glow = new Particles(900, sparkTexture(), true);
  private readonly puff = new Particles(500, glowTexture(), false);
  private n = 0;
  private stepPhase = 0;

  constructor() {
    this.group.add(this.glow.points, this.puff.points);
  }

  setViewHeight(pixels: number): void {
    this.glow.setViewHeight(pixels);
    this.puff.setViewHeight(pixels);
  }

  private r(): number {
    return hash(this.n++, 77);
  }

  private spread(): number {
    return this.r() * 2 - 1;
  }

  onEvent(event: RunEvent, run: Run): void {
    const s = run.runner;
    const x = s.x;
    const y = s.y;
    const z = -s.distance;
    switch (event.type) {
      case "coin":
        for (let i = 0; i < 7; i++) {
          this.glow.emit({ x: event.x, y: event.y, z: -event.z, vx: this.spread() * 3, vy: this.spread() * 3 + 1, vz: this.spread() * 2 - 4, life: 0.45, size: 0.5, color: i % 2 ? 0xfff3a0 : 0xffc629, drag: 0.1, grow: 0.2 });
        }
        break;
      case "jump":
        this.dust(x, y, z, 10, 1.4);
        if (event.boots) this.burst(x, y + 0.2, z, 0x3ddc84, 16, 4);
        break;
      case "land":
        this.dust(x, y, z, Math.min(18, 6 + event.speed), 2.2);
        break;
      case "roll":
        this.dust(x, y, z, 12, 2.6);
        break;
      case "stumble":
        this.sparks(x + event.side * 0.4, y + 1, z, 18, 0xffb627);
        break;
      case "crash":
        this.sparks(x, y + 1, z - 0.5, 60, 0xffc04d);
        this.dust(x, y, z, 24, 3.5);
        for (let i = 0; i < 6; i++) this.glow.emit({ x, y: y + 2, z, vx: Math.cos(i) * 1.2, vy: 0.6, vz: Math.sin(i) * 1.2, life: 1.6, size: 0.45, color: 0xffe14d, drag: 0.4 });
        break;
      case "saved":
        this.burst(x, y + 0.5, z, 0x4db8ff, 50, 7);
        this.sparks(x, y + 0.6, z - 0.6, 30, 0x9fe8ff);
        break;
      case "power":
        this.burst(x, y + 1, z, POWER_COLORS[event.kind], 40, 6);
        break;
      case "level":
        this.confetti(x, y, z);
        break;
      default:
        break;
    }
  }

  /** Continuous effects that follow the runner: footfalls, the jetpack's fire, the board's glow, the magnet's pull. */
  frame(run: Run, dt: number, time: number): void {
    const s = run.runner;
    const z = -s.distance;
    const powers = run.powers;
    if (!run.crashed) {
      if (s.grounded && s.rollLeft <= 0 && !powers.has("hoverboard")) {
        const before = this.stepPhase;
        this.stepPhase = (s.distance / 1.45) % 1;
        if (this.stepPhase < before) this.dust(s.x + (this.r() - 0.5) * 0.3, s.y, z + 0.3, 2, 0.7);
      }
      if (powers.has("jetpack")) {
        for (let i = 0; i < 3; i++) {
          this.glow.emit({ x: s.x + this.spread() * 0.12, y: s.y + 0.9, z: z + 0.45, vx: this.spread() * 0.6, vy: -5 - this.r() * 3, vz: 3, life: 0.35, size: 0.7, color: i ? 0xff8a1f : 0xffe14d, grow: 0.2 });
        }
        if (this.r() < 0.5) this.puff.emit({ x: s.x, y: s.y + 0.5, z: z + 0.8, vx: this.spread(), vy: -2, vz: 2, life: 1.2, size: 1.2, color: 0xdddddd, grow: 2.5, drag: 0.3 });
      }
      if (powers.has("hoverboard") && s.rollLeft <= 0) {
        this.glow.emit({ x: s.x + this.spread() * 0.2, y: s.y + 0.08, z: z + 0.6, vx: 0, vy: 0.3, vz: 2, life: 0.4, size: 0.5, color: 0x7ff3ff, grow: 0.3 });
      }
      if (powers.has("magnet") && this.r() < 0.6) {
        const a = time * 9 + this.r() * 6;
        this.glow.emit({ x: s.x + Math.cos(a) * 0.7, y: s.y + 1 + Math.sin(a) * 0.7, z, vx: 0, vy: 0, vz: 0, life: 0.3, size: 0.3, color: 0xff4d5e });
      }
    }
    this.glow.update(dt);
    this.puff.update(dt);
  }

  clear(): void {
    this.glow.clear();
    this.puff.clear();
  }

  dispose(): void {
    this.glow.dispose();
    this.puff.dispose();
  }

  private dust(x: number, y: number, z: number, count: number, force: number): void {
    for (let i = 0; i < count; i++) {
      const a = this.r() * Math.PI * 2;
      this.puff.emit({ x, y: y + 0.1, z, vx: Math.cos(a) * force, vy: this.r() * force * 0.4, vz: Math.sin(a) * force * 0.6 + 2, life: 0.6 + this.r() * 0.4, size: 0.6, color: 0xd9ccb8, grow: 2.6, drag: 0.05 });
    }
  }

  private sparks(x: number, y: number, z: number, count: number, color: number): void {
    for (let i = 0; i < count; i++) {
      this.glow.emit({ x, y, z, vx: this.spread() * 9, vy: this.r() * 8 + 1, vz: this.spread() * 6 + 3, life: 0.5 + this.r() * 0.5, size: 0.28, color: i % 3 ? color : 0xffffff, gravity: 16, grow: 0.3 });
    }
  }

  private burst(x: number, y: number, z: number, color: number, count: number, force: number): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      this.glow.emit({ x, y, z, vx: Math.cos(a) * force, vy: this.spread() * force * 0.4, vz: Math.sin(a) * force, life: 0.7, size: 0.55, color: i % 2 ? color : 0xffffff, drag: 0.08, grow: 0.2 });
    }
  }

  private confetti(x: number, y: number, z: number): void {
    for (let i = 0; i < 90; i++) {
      this.puff.emit({ x: x + this.spread() * 3, y: y + 4 + this.r() * 2, z: z - 6 - this.r() * 6, vx: this.spread() * 4, vy: this.r() * 5, vz: this.spread() * 2 + 4, life: 1.8, size: 0.35, color: CONFETTI[i % CONFETTI.length]!, gravity: 5, drag: 0.4, grow: 0.8 });
    }
  }
}
