import * as THREE from "three";
import { speedOf, type Kart } from "../engine/kart";
import type { Track } from "../engine/track";
import type { KartExtras } from "./kart-extras";
import { nameTag } from "./kart-extras";
import { KartModel } from "./models/kart-model";
import { kartDesign } from "./models/karts";

const local = new THREE.Vector3();

/**
 * One kart as the big screen draws it: the model, posed from the race
 * state, plus its shadow, flag, name tag, and the look of whatever is
 * happening to it: flames while boosting, a bubble while shielded, stars
 * while spun out, ice while frozen, and fading away while invisible.
 */
export class KartView {
  readonly model: KartModel;
  private readonly shadow: THREE.Mesh;
  private readonly flag: THREE.Mesh;
  private readonly tag: THREE.Sprite;
  private readonly shield: THREE.Mesh;
  private readonly stars = new THREE.Group();
  private readonly ice = new THREE.Group();
  private readonly flames: THREE.Group[] = [];
  private pitch = 0;
  private ghost = false;
  /** Whether the shadow shows at all this frame, before any per view hiding. */
  private shadowOn = false;
  private shieldOn = false;
  private boosting = false;
  private readonly footprint: { w: number; l: number };

  constructor(readonly kartId: number, kart: Kart, name: string, color: string, extras: KartExtras, scene: THREE.Object3D) {
    this.model = new KartModel(kart.character);
    const design = kartDesign(kart.character);
    this.shadow = new THREE.Mesh(extras.shadowGeo, extras.shadowMat);
    this.footprint = { w: design.width * 1.35, l: design.length * 1.15 };
    this.shadow.renderOrder = 1;
    const flagShape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, -0.42), new THREE.Vector2(-0.7, -0.21)]);
    this.flag = new THREE.Mesh(new THREE.ShapeGeometry(flagShape), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    this.flag.position.set(...design.flagAt);
    this.model.chassis.add(this.flag);
    this.tag = nameTag(name, color);
    this.tag.position.y = 3.1;
    this.shield = new THREE.Mesh(extras.shieldGeo, extras.shieldMat);
    this.shield.position.y = 0.9;
    this.shield.scale.set(1, 0.8, 1.15);
    for (let i = 0; i < 3; i++) this.stars.add(new THREE.Mesh(extras.starGeo, extras.starMat));
    this.stars.position.y = 2.3;
    for (const wheel of design.wheels) {
      const crystal = new THREE.Mesh(extras.iceGeo, extras.iceMat);
      crystal.position.set(...wheel.at);
      crystal.scale.set(0.9, 1.3, 0.9);
      this.ice.add(crystal);
    }
    for (const at of design.exhausts) {
      const flame = new THREE.Group();
      flame.position.set(...at);
      flame.add(new THREE.Mesh(extras.flameGeo, extras.flameMat));
      const core = new THREE.Mesh(extras.flameGeo, extras.flameCoreMat);
      core.scale.setScalar(0.55);
      flame.add(core);
      this.model.chassis.add(flame);
      this.flames.push(flame);
    }
    this.model.root.add(this.tag, this.shield, this.stars, this.ice);
    scene.add(this.model.root, this.shadow);
  }

  /** Poses everything for this frame from the kart's state. */
  update(kart: Kart, track: Track, dt: number, time: number): void {
    const root = this.model.root;
    root.position.set(kart.x, kart.y, kart.z);
    root.rotation.set(0, kart.heading + kart.spin, 0, "YXZ");
    // Nose up and down with the road, and a bit more with the jump's arc.
    const ahead = track.pointAt(kart.loc.s + 1.5, kart.loc.d).y;
    const behind = track.pointAt(kart.loc.s - 1.5, kart.loc.d).y;
    const slope = Math.atan2(ahead - behind, 3);
    const target = kart.airborne ? Math.max(-0.5, Math.min(0.4, -kart.vy * 0.04)) : -slope;
    this.pitch += (target - this.pitch) * Math.min(1, dt * 10);
    this.model.chassis.rotation.x = this.pitch;
    const speed = speedOf(kart) * Math.sign(Math.sin(kart.heading) * kart.vx + Math.cos(kart.heading) * kart.vz || 1);
    this.model.animate(speed, kart.steer, dt, time + kart.id, kart.airborne ? 0 : 1);
    this.flag.rotation.y = Math.sin(time * 9 + kart.id) * 0.35;

    const ground = track.groundAt(kart.loc.s, kart.loc.d);
    this.shadowOn = ground !== null && kart.y - ground < 12;
    if (ground !== null) {
      this.shadow.position.set(kart.x, ground + 0.06, kart.z);
      this.shadow.rotation.y = kart.heading;
      // Higher in the air, the shadow shrinks, like a real one spreading out and fading.
      const fade = Math.max(0.35, 1 - (kart.y - ground) / 12);
      this.shadow.scale.set(this.footprint.w * fade, 1, this.footprint.l * fade);
    }

    const t = kart.timers;
    this.shieldOn = t.shield > 0;
    this.stars.visible = t.stun > 0;
    if (this.stars.visible) {
      this.stars.children.forEach((star, i) => {
        const a = time * 7 + (i / 3) * Math.PI * 2;
        star.position.set(Math.cos(a) * 0.7, Math.sin(time * 5 + i) * 0.12, Math.sin(a) * 0.7);
        star.rotation.y = a * 2;
      });
    }
    this.ice.visible = t.ice > 0;
    const boosting = t.boost > 0;
    this.boosting = boosting;
    for (const flame of this.flames) {
      if (boosting) flame.scale.set(1, 1, 0.8 + Math.random() * 0.7 + Math.min(1, t.boost) * 0.5);
    }
    this.model.setTint(t.ice > 0 ? "#3fb8ff" : "#ffffff", t.ice > 0 ? 0.35 : t.stun > 0 ? 0.12 * (Math.sin(time * 30) > 0 ? 1 : 0) : 0);
    this.ghost = t.ghost > 0;
    // Blink while protected after a respawn.
    root.visible = t.grace <= 0 || Math.sin(time * 28) > -0.4;
  }

  /**
   * Called before drawing each player's view. The viewer's own kart hides
   * its name tag, and a vanished kart is a faint shimmer to everyone but
   * its driver, who still sees a ghost of it.
   */
  setViewer(viewerKartId: number | null): void {
    const own = viewerKartId === this.kartId;
    this.tag.visible = !own && !this.ghost;
    this.model.setOpacity(this.ghost ? (own ? 0.4 : 0.06) : 1);
    const hidden = this.ghost && !own;
    this.shadow.visible = this.shadowOn && !hidden;
    this.flag.visible = !hidden;
    // A bubble or flames would give a vanished kart away, so others do not see them.
    this.shield.visible = this.shieldOn && !hidden;
    for (const flame of this.flames) flame.visible = this.boosting && !hidden;
  }

  /** A point on the kart, in the world, for effects to come from. */
  worldPoint(x: number, y: number, z: number, out: THREE.Vector3): THREE.Vector3 {
    local.set(x, y, z);
    return out.copy(local).applyMatrix4(this.model.chassis.matrixWorld);
  }

  dispose(scene: THREE.Object3D): void {
    scene.remove(this.model.root, this.shadow);
    this.model.dispose();
    this.flag.geometry.dispose();
    (this.flag.material as THREE.Material).dispose();
    this.tag.material.map?.dispose();
    this.tag.material.dispose();
  }
}
