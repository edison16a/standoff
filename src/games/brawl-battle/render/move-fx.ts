import * as THREE from "three";
import { Rng } from "../engine/rng";
import type { Fighter } from "../engine/types";
import type { Anchors } from "./anchors";
import { FX } from "./colors";
import type { Effects } from "./effects/effects";
import { dotTexture, rayTexture } from "./effects/textures";

/** A move's frames with a ray, when it grows in, holds and fades, and how far it reaches from the fighter. */
interface RaySpec {
  from: number;
  full: number;
  fade: number;
  to: number;
  reach: number;
  width: number;
}

/** Arcane Beam holds across the stage ahead; Light Pillar stands straight up. */
const BEAM: RaySpec = { from: 14, full: 17, fade: 35, to: 40, reach: 4.7, width: 0.95 };
const PILLAR: RaySpec = { from: 10, full: 12, fade: 19, to: 24, reach: 4.4, width: 1.5 };

/** Arcane Beam's hitboxes run this high above the feet. */
const BEAM_Y = 1.2;

/** Horizontal speed that counts as a dash, metres per second. */
const DASH = 8.5;

const additive = (map: THREE.Texture, colour: THREE.ColorRepresentation) =>
  new THREE.MeshBasicMaterial({ map, color: colour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });

const point = new THREE.Vector3();

/**
 * Light a move makes beyond its trail: the Mage's arcane beam and light
 * pillar as solid rays with a white core, and speed lines and dust
 * behind any move that dashes, like Wide Slash, Spark, Lightning Draw
 * and Dragon Flight.
 */
export class MoveFx {
  readonly group = new THREE.Group();
  private readonly ray: THREE.Group;
  private readonly glow: THREE.Sprite;
  private readonly texture = rayTexture();
  private readonly dot = dotTexture();
  private readonly geo = new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0);
  private readonly rng: Rng;
  private readonly roll = () => this.rng.next();
  private lineAt = 0;

  constructor(
    f: Fighter,
    private readonly anchors: Anchors,
    private readonly fx: Effects,
  ) {
    const colour = FX[f.character].aura;
    this.rng = new Rng(29 + f.id);
    const outer = new THREE.Mesh(this.geo, additive(this.texture, colour));
    const core = new THREE.Mesh(this.geo, additive(this.texture, "#ffffff"));
    core.scale.y = 0.4;
    core.position.z = 0.01;
    this.ray = new THREE.Group();
    this.ray.add(outer, core);
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.dot, color: colour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.group.add(this.ray, this.glow);
    this.group.visible = false;
  }

  update(f: Fighter, x: number, y: number, height: number, time: number): void {
    const attacking = f.action === "attack" && f.move !== null;
    const spec = attacking && f.character === "mage" ? (f.move === "holdHeavy" ? BEAM : f.move === "holdUp" ? PILLAR : null) : null;
    this.group.visible = spec !== null && f.frame >= spec.from && f.frame <= spec.to;
    if (spec && this.group.visible) this.shine(spec, f, x, y, time);
    if (attacking && Math.abs(f.vel.x) > DASH) this.dash(f, x, y, height, time);
  }

  private shine(spec: RaySpec, f: Fighter, x: number, y: number, time: number): void {
    const grow = Math.min(1, (f.frame - spec.from + 1) / (spec.full - spec.from + 1));
    const fade = f.frame > spec.fade ? 1 - (f.frame - spec.fade) / (spec.to - spec.fade) : 1;
    const width = spec.width * (1 + f.charged * 0.4) * grow * fade * (1 + Math.sin(time * 45) * 0.08);
    const beam = spec === BEAM;
    // The beam leaves the staff's gem at the height its hitboxes run; the pillar rises from the floor in front.
    const start = beam ? this.anchors.world("tip", point).setY(y + BEAM_Y) : point.set(x + f.facing * 0.3, y, 0);
    const reach = beam ? Math.abs(x + f.facing * spec.reach - start.x) : spec.reach;
    this.ray.position.set(start.x, start.y, 0.25);
    this.ray.rotation.z = beam ? (f.facing > 0 ? 0 : Math.PI) : Math.PI / 2;
    this.ray.scale.set(reach * Math.min(1, grow * 1.5), width, 1);
    this.glow.position.set(start.x, start.y, 0.3);
    this.glow.scale.setScalar(width * 2.4);
    const colour = FX[f.character].aura;
    const along = this.roll() * reach;
    const px = beam ? start.x + f.facing * along : start.x + (this.roll() - 0.5) * width;
    const py = beam ? start.y + (this.roll() - 0.5) * width * 0.6 : start.y + along;
    this.fx.glow.burst({ x: px, y: py, z: 0.35, count: 2, colour: this.roll() < 0.4 ? "#ffffff" : colour, speed: [0.5, 2.5], life: [0.15, 0.35], size: [0.08, 0.18], gravity: 0, drag: 0.2 }, this.roll);
  }

  /** Speed lines streaming off the body, and dust kicked up while the feet are down. */
  private dash(f: Fighter, x: number, y: number, height: number, time: number): void {
    if (time - this.lineAt < 0.03) return;
    this.lineAt = time;
    const angle = f.facing > 0 ? Math.PI : 0;
    for (let i = 0; i < 2; i++) {
      const h = y + height * (0.15 + 0.75 * this.roll());
      this.fx.pulses.spawn({ kind: "streak", x: x - f.facing * (0.6 + this.roll() * 0.6), y: h, z: -0.1, colour: i === 0 ? "#ffffff" : FX[f.character].aura, from: 1.4, to: 2.2, life: 0.16, thin: 0.045, angle, opacity: 0.75 });
    }
    if (f.ground !== null) this.fx.dust(x - f.facing * 0.3, y, 2);
  }

  dispose(): void {
    this.texture.dispose();
    this.dot.dispose();
    this.geo.dispose();
    this.glow.material.dispose();
    for (const m of this.ray.children) ((m as THREE.Mesh).material as THREE.Material).dispose();
  }
}
