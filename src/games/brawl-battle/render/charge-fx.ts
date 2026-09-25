import * as THREE from "three";
import { chargeLevel } from "../engine/charge";
import { isChargeKey, moveOf } from "../engine/moves";
import { Rng } from "../engine/rng";
import type { Fighter } from "../engine/types";
import type { Anchors } from "./anchors";
import { STYLES } from "./anim/styles";
import { FX } from "./colors";
import type { Effects } from "./effects/effects";
import { dotTexture } from "./effects/textures";

const RINGS = 2;
const white = new THREE.Color("#ffffff");
const point = new THREE.Vector3();

const glowSprite = (map: THREE.Texture) =>
  new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));

/**
 * What a charge looks like round the fighter: an aura that swells and
 * pulses faster as it fills, a hot light gathering on the fist, foot,
 * blade or gem that will strike, sparks drawn in from all round, rings
 * closing in at the feet, a flash when it is full and a flare as it is
 * let go, bigger the longer it was held.
 */
export class ChargeFx {
  readonly group = new THREE.Group();
  private readonly map = dotTexture();
  private readonly aura = glowSprite(this.map);
  private readonly core = glowSprite(this.map);
  private readonly rings: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly colour: THREE.Color;
  private readonly hot = new THREE.Color();
  /** Seeded per fighter, so a filmed showcase always gathers the same sparks. */
  private readonly rng: Rng;
  private readonly roll = () => this.rng.next();
  private sparks = 0;
  private full = false;
  private wasCharging = false;

  constructor(
    f: Fighter,
    private readonly anchors: Anchors,
    private readonly fx: Effects,
  ) {
    this.colour = new THREE.Color(FX[f.character].aura);
    this.rng = new Rng(91 + f.id);
    this.aura.material.color.copy(this.colour);
    const ringGeo = new THREE.TorusGeometry(1, 0.035, 4, 28);
    for (let i = 0; i < RINGS; i++) {
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: this.colour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      ring.rotation.x = Math.PI / 2;
      this.rings.push(ring);
    }
    this.group.add(this.aura, this.core, ...this.rings);
    this.group.visible = false;
  }

  /** The rig's matrices must be up to date, since the light sits on the striking limb. */
  update(f: Fighter, x: number, y: number, height: number, time: number, dt: number): void {
    const charging = f.action === "charge" && f.move !== null;
    if (this.wasCharging && !charging && f.action === "attack" && f.move && isChargeKey(f.move)) this.flare(f, height);
    this.wasCharging = charging;
    this.group.visible = charging;
    if (!charging) {
      this.full = false;
      return;
    }
    const level = chargeLevel(f);
    const beat = Math.sin(time * (7 + 16 * level));
    const mid = y + height * 0.5;
    this.aura.position.set(x, mid, -0.35);
    this.aura.scale.setScalar(height * (1.2 + 0.9 * level) * (1 + beat * 0.06));
    this.aura.material.opacity = 0.2 + 0.45 * level;
    const at = this.lead(f, x, mid);
    this.core.position.copy(at);
    this.core.scale.setScalar((0.3 + 0.75 * level) * (1 + beat * 0.15));
    this.core.material.color.copy(this.hot.copy(this.colour).lerp(white, 0.3 + 0.6 * level));
    this.core.material.opacity = 0.55 + 0.45 * level;
    // Rings close in on the feet, faster as the charge fills.
    this.rings.forEach((ring, i) => {
      const phase = (time * (0.8 + 1.8 * level) + i / RINGS) % 1;
      ring.position.set(x, y + 0.06, 0);
      ring.scale.setScalar(0.25 + (1 - phase) * height * 0.9);
      ring.material.opacity = phase * (0.35 + 0.55 * level);
    });
    this.gather(x, mid, height, level, dt);
    if (level >= 1 && !this.full) {
      this.full = true;
      this.fx.pulses.spawn({ kind: "star", x: at.x, y: at.y, colour: "#ffffff", from: 0.6, to: 2, life: 0.25, spin: 4 });
      this.fx.pulses.spawn({ kind: "ring", x, y: mid, colour: this.hex(), from: 0.5, to: height * 1.6, life: 0.35, opacity: 0.8 });
    }
  }

  /** Sparks drawn in toward the body from all round, more of them as it fills. */
  private gather(x: number, mid: number, height: number, level: number, dt: number): void {
    this.sparks += dt * (18 + 70 * level);
    const colour = this.hex();
    while (this.sparks >= 1) {
      this.sparks--;
      const a = this.roll() * Math.PI * 2;
      const r = height * (0.7 + 0.5 * this.roll());
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const pull = r / 0.32;
      const tone = this.roll() < 0.3 ? "#ffffff" : colour;
      this.fx.glow.burst({ x: x + dx * r, y: mid + dy * r, z: 0.2, count: 1, colour: tone, speed: [0, 0.2], life: [0.26, 0.32], size: [0.07, 0.15], gravity: 0, drag: 1, push: { x: -dx * pull, y: -dy * pull, z: 0 } }, this.roll);
    }
  }

  /** The release: a flash where the move strikes first and a burst thrown forward, as big as the charge. */
  private flare(f: Fighter, height: number): void {
    const power = 0.4 + 0.6 * f.charged;
    const move = moveOf(f.character, f.move!);
    const first = move.hitboxes[0] ?? move.projectiles?.[0];
    const at = first ? point.set(f.pos.x + first.x * f.facing, f.pos.y + first.y, 0.4) : point.set(f.pos.x + f.facing * 0.8, f.pos.y + height * 0.5, 0.4);
    const colour = this.hex();
    this.fx.pulses.spawn({ kind: "star", x: at.x, y: at.y, colour: "#ffffff", from: 0.6, to: 1 + 1.2 * power, life: 0.2, spin: 5 });
    this.fx.pulses.spawn({ kind: "ring", x: at.x, y: at.y, colour, from: 0.4, to: 1.4 + 1.8 * power, life: 0.3, opacity: 0.8 });
    this.fx.glow.burst({ x: at.x, y: at.y, z: 0.3, count: Math.round(16 + 40 * power), colour, speed: [3, 8 + 6 * power], up: 0.5, life: [0.2, 0.5], size: [0.1, 0.22], gravity: 3, drag: 0.15, push: { x: f.facing * 4, y: 0, z: 0 } }, this.roll);
  }

  /** The limb the move strikes with, or the chest for moves that use the whole body. */
  private lead(f: Fighter, x: number, mid: number): THREE.Vector3 {
    const anchor = f.move ? STYLES[f.character].moves[f.move].trail : undefined;
    if (!anchor || anchor === "none") return point.set(x, mid, 0.4);
    this.anchors.world(anchor, point);
    point.z += 0.2;
    return point;
  }

  private hex(): string {
    return `#${this.colour.getHexString()}`;
  }

  dispose(): void {
    this.map.dispose();
    this.aura.material.dispose();
    this.core.material.dispose();
    this.rings[0]?.geometry.dispose();
    for (const ring of this.rings) ring.material.dispose();
  }
}
