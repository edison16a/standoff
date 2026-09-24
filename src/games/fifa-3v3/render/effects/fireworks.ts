import * as THREE from "three";
import { Rng } from "../../engine/rng";
import { Particles } from "./particles";

interface Rocket {
  p: THREE.Vector3;
  v: THREE.Vector3;
  colour: THREE.Color;
  fuse: number;
}

/**
 * Fireworks over the stands for the winners: rockets climb trailing
 * sparks, then burst into a shell of colour that droops and fades.
 * `onBurst` lets the sound bang in time.
 */
export class Fireworks {
  readonly sparks: Particles;
  private rockets: Rocket[] = [];
  private readonly rng = new Rng(4);
  private clock = 0;
  private colours: THREE.Color[] = [];
  private running = 0;
  onBurst: ((at: THREE.Vector3) => void) | null = null;

  constructor(glow: THREE.Texture) {
    this.sparks = new Particles({ max: 2600, size: 0.55, map: glow, additive: true, gravity: 2.2, drag: 0.45 });
  }

  /** Keeps launching for `seconds`, in these colours. */
  start(colours: readonly string[], seconds: number): void {
    this.colours = colours.map((c) => new THREE.Color(c));
    this.running = seconds;
    this.clock = 0;
  }

  stop(): void {
    this.running = 0;
    this.rockets = [];
  }

  update(dt: number): void {
    const r = this.rng;
    if (this.running > 0) {
      this.running -= dt;
      this.clock -= dt;
      if (this.clock <= 0) {
        this.clock = r.range(0.25, 0.7);
        const side = r.sign();
        this.rockets.push({
          p: new THREE.Vector3(r.range(-24, 24), 6, side < 0 ? r.range(-30, -22) : r.range(-26, 14)),
          v: new THREE.Vector3(r.range(-1.5, 1.5), r.range(19, 25), r.range(-1, 1)),
          colour: r.pick(this.colours.length ? this.colours : [new THREE.Color("#ffd166")]),
          fuse: r.range(1.1, 1.6),
        });
      }
    }
    const trail = new THREE.Color("#ffcf7a");
    this.rockets = this.rockets.filter((rocket) => {
      rocket.fuse -= dt;
      rocket.v.y -= 9.8 * dt;
      rocket.p.addScaledVector(rocket.v, dt);
      this.sparks.emit(rocket.p.x, rocket.p.y, rocket.p.z, r.range(-0.4, 0.4), -1, r.range(-0.4, 0.4), trail, 0.35);
      if (rocket.fuse > 0) return true;
      this.burst(rocket);
      return false;
    });
    this.sparks.update(dt);
  }

  private burst(rocket: Rocket): void {
    const r = this.rng;
    const white = new THREE.Color("#ffffff");
    for (let i = 0; i < 150; i++) {
      // Evenly round a sphere, with a little scatter.
      const u = r.next() * 2 - 1;
      const a = r.next() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const speed = r.range(9, 13);
      const colour = i % 7 === 0 ? white : rocket.colour;
      this.sparks.emit(rocket.p.x, rocket.p.y, rocket.p.z, Math.cos(a) * s * speed, u * speed, Math.sin(a) * s * speed, colour, r.range(1.3, 2.1));
    }
    this.onBurst?.(rocket.p);
  }

  dispose(): void {
    this.sparks.dispose();
  }
}
