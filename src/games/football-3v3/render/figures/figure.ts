import * as THREE from "three";
import type { AthleteView } from "../../engine/view";
import { applyPose } from "../anim/apply";
import { aheadSpeed, choosePose, type Chosen, type PoseScene } from "../anim/choose";
import { strideLength } from "../anim/gait";
import { approach, neutral, type Pose } from "../anim/pose";
import { Jolt, wobble } from "../anim/reactions";
import type { Lod } from "../models/athlete-shapes";
import { buildBody, type Rig, type Wardrobe } from "../models/body";
import type { KitSpec } from "../models/kit";
import { Facing } from "./facing";
import { Feet } from "./feet";

/** A spot on a joint that can touch the turf, and how far the body sticks out past it. */
interface Contact {
  at: THREE.Object3D;
  radius: number;
}

const v = new THREE.Vector3();
const w = new THREE.Vector3();
const inverse = new THREE.Matrix4();

/**
 * One player on the field: the model, and the animation that follows
 * the engine's view of them. Each frame it picks a target pose, eases
 * toward it, and then stands the body on the turf: the lowest point of
 * the body touches the grass and the hips sit over the player's spot.
 * That one rule makes stances, dives, tackles and getting up all land
 * right without hand placed heights.
 */
export class Figure {
  readonly rig: Rig;
  readonly kit: KitSpec;
  private readonly pose: Pose = neutral();
  /** The eased pose with this frame's jolts and wobbles on top, as drawn. */
  private shown: Pose = neutral();
  private readonly contacts: Contact[];
  private readonly feet = new Feet();
  private readonly jolt = new Jolt();
  private readonly facing = new Facing();
  /** Acceleration along the facing and to the left, eased over a tenth of a second. */
  private push = 0;
  private turn = 0;
  /** Seconds since this player took the ball in his hands, or null without it. */
  private secured: number | null = null;
  private readonly hipsAnchor: THREE.Object3D;
  private phase = 0;
  private hand: Chosen["hand"] = "R";
  private readonly seed: number;

  constructor(kit: KitSpec, wardrobe: Wardrobe, readonly id: number) {
    this.kit = kit;
    this.rig = buildBody(kit, wardrobe);
    this.seed = id * 1.37;
    const r = this.rig;
    const d = r.dims;
    const H = d.height;
    const anchor = (parent: THREE.Object3D, x: number, y: number, z: number, radius: number): Contact => {
      const at = new THREE.Object3D();
      at.position.set(x, y, z);
      parent.add(at);
      return { at, radius };
    };
    // The heel and the toe of each cleat, the knees, hands and elbows, the seat, the pads and the helmet.
    const sole = -d.ankleY;
    this.contacts = [
      anchor(r.ankleL, 0, sole + 0.02, d.heel + 0.035, 0.02), anchor(r.ankleR, 0, sole + 0.02, d.heel + 0.035, 0.02),
      anchor(r.ankleL, 0, sole + 0.015, d.toe - 0.03, 0.015), anchor(r.ankleR, 0, sole + 0.015, d.toe - 0.03, 0.015),
      anchor(r.kneeL, 0, 0, 0.012 * H, 0.04 * H), anchor(r.kneeR, 0, 0, 0.012 * H, 0.04 * H),
      anchor(r.handL, 0, -0.02, 0, 0.045), anchor(r.handR, 0, -0.02, 0, 0.045),
      anchor(r.elbowL, 0, 0, 0, 0.035), anchor(r.elbowR, 0, 0, 0, 0.035),
      anchor(r.hips, 0, -0.02 * H, 0, 0.09 * H), anchor(r.spine, 0, d.shoulderY - d.spineY - 0.04 * H, 0, 0.095 * H),
      anchor(r.neck, 0, d.head, 0, 0.14 * d.headScale),
    ];
    this.hipsAnchor = r.hips;
  }

  get root(): THREE.Group {
    return this.rig.root;
  }

  update(a: AthleteView, scene: PoseScene, dt: number, time: number): void {
    // Legs move through their stride by the ground covered, so the feet do not skate.
    const ahead = aheadSpeed(a);
    const dir = ahead < -0.5 ? -1 : 1;
    // Braking chops the stride into quick short steps.
    const chop = 1 - 0.4 * Math.max(0, Math.min(1, -this.push / 7));
    this.phase = (this.phase + dir * (a.speed * dt) / (strideLength(a.speed, this.rig.legLength) * chop) + 1) % 1;
    // The engine's acceleration in the body's own frame: along the facing and to its left.
    const push = a.ax * Math.sin(a.yaw) + a.az * Math.cos(a.yaw);
    const turn = a.ax * Math.cos(a.yaw) - a.az * Math.sin(a.yaw);
    const ease = 1 - Math.exp(-dt * 10);
    this.push += (push - this.push) * ease;
    this.turn += (turn - this.turn) * ease;
    this.jolt.update(push, turn, this.push, this.turn, dt);
    this.secured = a.hasBall ? (this.secured ?? 0) + dt : null;
    const chosen = choosePose(a, scene, { phase: this.phase, build: this.kit.build, time, seed: this.seed, push: this.push, turn: this.turn, secured: this.secured });
    this.hand = chosen.hand;
    approach(this.pose, chosen.pose, chosen.rate, dt);
    this.shown = { ...this.pose };
    this.jolt.apply(this.shown);
    wobble(this.shown, a.stagger, time, this.seed);
    const root = this.rig.root;
    root.position.set(a.x, 0, a.z);
    root.rotation.set(0, this.facing.update(a.yaw, a.x, a.z, dt), 0);
    this.stand();
    this.feet.update(this.rig, chosen.feet, this.phase, a.speed, dt);
  }

  /** Applies the pose, then shifts the body so it rests on the turf with the hips over the spot. */
  private stand(): void {
    const r = this.rig;
    applyPose(r, this.shown);
    // Measure the body where it stands on its own, then move it into place.
    r.body.position.set(0, 0, 0);
    r.root.updateMatrixWorld(true);
    inverse.copy(r.root.matrixWorld).invert();
    let low = Infinity;
    for (const c of this.contacts) {
      c.at.getWorldPosition(v).applyMatrix4(inverse);
      low = Math.min(low, v.y - c.radius);
    }
    this.hipsAnchor.getWorldPosition(w).applyMatrix4(inverse);
    r.body.position.set(this.shown.side - w.x, this.shown.lift - low, this.shown.fwd - w.z);
    r.root.updateMatrixWorld(true);
  }

  /**
   * Where the ball sits when this player holds it, and which way its
   * long axis points: tucked along the right forearm, or held in both
   * hands in front of the chest.
   */
  grip(pos: THREE.Vector3, axis: THREE.Vector3): void {
    const r = this.rig;
    r.handR.getWorldPosition(pos);
    r.elbowR.getWorldPosition(v);
    axis.copy(pos).sub(v).normalize();
    if (this.hand === "both") {
      r.handL.getWorldPosition(w);
      pos.add(w).multiplyScalar(0.5);
      // Held across the body with the nose up and out, as a QB carries it.
      axis.set(Math.sin(r.root.rotation.y), 0.6, Math.cos(r.root.rotation.y)).normalize();
      return;
    }
    // Slightly into the palm, so the forearm wraps the ball.
    pos.addScaledVector(axis, 0.04);
    pos.y -= 0.02;
  }

  /**
   * Picks the level of detail from how tall the player stands on screen,
   * `fill` being his height over the view's height: the full body for a
   * close look, the lighter one across the field. A margin either way
   * stops a player flickering between them at the boundary.
   */
  showAt(fill: number): void {
    if (fill > 0.2) this.lod = "near";
    else if (fill < 0.16) this.lod = "far";
    this.rig.setLod(this.lod);
  }

  private lod: Lod = "near";

  /** A point over the head, for the name tag. */
  top(out: THREE.Vector3): THREE.Vector3 {
    this.rig.neck.getWorldPosition(out);
    out.y += 0.55;
    return out;
  }

  dispose(): void {
    this.rig.root.removeFromParent();
    this.rig.dispose();
  }
}
