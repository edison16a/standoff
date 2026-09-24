import * as THREE from "three";
import type { MatchEvent } from "../../engine/events";
import type { ActivePunch } from "../../engine/fighter";
import type { Hand } from "../../engine/types";
import type { BoxerModel } from "../models/boxer-model";
import { BoxerRig } from "../rig/boxer-rig";
import { stance, type RigPose } from "../rig/pose";
import type { AnimInput } from "./anim-input";
import { BodyMotion, fallParts } from "./body-motion";
import { FootPlanner, STANCE_FEET } from "./feet";
import { blendHand, CHEST_POSES, cloneHand, ROOT_POSES, type HandPose } from "./hand-poses";
import { punchShape, REST, type PunchShape } from "./punch-curve";
import { SpringVector } from "./springs";

const HANDS: readonly Hand[] = ["left", "right"];
/** From the wrist to the knuckles of the glove, which is what should land. */
const GLOVE_REACH = 0.15;
const FACE_OFFSET = new THREE.Vector3(0, 0.09, 0.075);
const LYING_FEET: Record<Hand, THREE.Vector3> = { left: new THREE.Vector3(0.2, 0.075, 0.28), right: new THREE.Vector3(-0.22, 0.075, 0.12) };

/**
 * Brings one boxer to life every frame: the trunk from BodyMotion, the
 * hands from the guard, the camera or a punch, the feet from the foot
 * planner, and the face's blinks, bruises and sweat. The rig then
 * reaches every limb into place.
 */
export class BoxerAnimator {
  readonly rig: BoxerRig;
  readonly body: BodyMotion;
  /** The pose worked out this frame, which the replay records. */
  readonly pose: RigPose = stance();
  private readonly feet = new FootPlanner();
  private readonly hands: Record<Hand, SpringVector> = { left: new SpringVector(), right: new SpringVector() };
  private readonly poles: Record<Hand, SpringVector> = { left: new SpringVector(), right: new SpringVector() };
  private readonly aim = new THREE.Vector3();
  private aimFor: number | null = null;
  private shape: PunchShape = REST;
  private readonly tmp = new THREE.Vector3();

  constructor(
    readonly model: BoxerModel,
    readonly id: number,
  ) {
    this.rig = new BoxerRig(model);
    this.body = new BodyMotion(id + 1);
  }

  onEvent(event: MatchEvent): void {
    this.body.onEvent(event, this.id);
  }

  /** The middle of this boxer's face in the world, where punches aim. */
  face(out: THREE.Vector3): THREE.Vector3 {
    return this.model.head.localToWorld(out.copy(FACE_OFFSET));
  }

  /** The current punch's shape, for effects like the whoosh and the glint. */
  get punchShape(): PunchShape {
    return this.shape;
  }

  update(input: AnimInput): void {
    const { fighter, now } = input;
    const punch = fighter.punch && now < fighter.punch.endAt ? fighter.punch : null;
    this.shape = punch ? punchShape(punch, now) : REST;
    this.body.update(input, this.pose, this.shape, punch);
    this.rig.applyBody(this.pose);
    for (const hand of HANDS) this.placeHand(hand, input, punch);
    this.placeFeet(input);
    this.rig.applyLimbs(this.pose);
    this.dressFace(input);
  }

  private placeHand(hand: Hand, input: AnimInput, punch: ActivePunch | null): void {
    const body = this.body;
    const held = cloneHand(CHEST_POSES.guard[hand]);
    blendHand(held, CHEST_POSES.block[hand], body.guard.value);
    blendHand(held, CHEST_POSES.sag[hand], body.stagger.value * 0.8);
    blendHand(held, CHEST_POSES.cheer[hand], body.cheer.value);
    blendHand(held, CHEST_POSES.slump[hand], body.slump.value);
    const pose: HandPose = { target: this.rig.chestToModel(held.target, new THREE.Vector3()), pole: this.rig.chestToModel(held.pole, new THREE.Vector3()) };
    blendHand(pose, ROOT_POSES.ropes[hand], body.corner.value);
    const shoulder = this.rig.shoulder(hand, new THREE.Vector3());
    const mirror = input.mirror;
    const reach = mirror?.reach[hand];
    if (reach && !input.fighter.down && input.mode === "fight") {
      // The player's own arm, as seen by the camera, fading to the sag when they are staggered.
      const weight = 1 - body.stagger.value * 0.7;
      pose.target.lerp(this.tmp.copy(shoulder).add(reach), weight);
      const elbow = mirror.elbow[hand];
      if (elbow) pose.pole.lerp(this.tmp.copy(shoulder).addScaledVector(elbow, 2), weight);
    }
    const { sag, topple } = fallParts(body.fall);
    if (sag > 0) blendHand(pose, { target: this.rig.chestToModel(CHEST_POSES.sag[hand].target, this.tmp.clone()), pole: pose.pole.clone() }, sag * (1 - topple));
    if (topple > 0) blendHand(pose, ROOT_POSES.fallen[hand], topple);
    const target = this.hands[hand].update(pose.target, input.dt, mirror ? 14 : 9);
    const pole = this.poles[hand].update(pose.pole, input.dt, 8);
    const out = this.pose.hands[hand];
    out.target.copy(target);
    out.pole.copy(pole);
    this.pose.gloveRoll[hand] = 0.4;
    if (punch && punch.hand === hand) this.strike(hand, input, punch, shoulder);
  }

  /** Drives the punching glove out to the other boxer's face, on top of wherever the hand was. */
  private strike(hand: Hand, input: AnimInput, punch: ActivePunch, shoulder: THREE.Vector3): void {
    const shape = this.shape;
    // The aim follows the face through the wind up, then commits as the punch leaves.
    if (this.aimFor !== punch.start || shape.extend === 0) {
      this.aimFor = punch.start;
      this.rig.worldToModel(input.opponentFace, this.aim);
      if (input.opponentBlocking) this.aim.z -= 0.12;
    }
    const side = hand === "left" ? 1 : -1;
    const out = this.pose.hands[hand];
    const toAim = this.tmp.copy(this.aim).sub(shoulder);
    const wrist = shoulder.clone().add(toAim.multiplyScalar(Math.max(0, 1 - GLOVE_REACH / Math.max(0.2, toAim.length()))));
    const hook = punch.style === "hook";
    out.target.lerp(wrist, shape.extend);
    out.target.add(this.tmp.set(side * (hook ? 0.08 : 0.02), -0.03, -0.12).multiplyScalar(shape.cock));
    if (hook) out.target.add(this.tmp.set(side * 0.28, 0.05, -0.05).multiplyScalar(shape.swing));
    const pole = shoulder.clone().add(hook ? this.tmp.set(side * 0.9, 0.05, -0.15) : this.tmp.set(side * 0.35, -0.7, -0.1));
    out.pole.lerp(pole, Math.max(shape.extend, shape.cock));
    this.pose.gloveRoll[hand] = hook ? 0.9 : 0.1;
  }

  private placeFeet(input: AnimInput): void {
    const scale = this.model.look.height;
    const standing = 1 - fallParts(this.body.fall).topple;
    const world = this.feet.update(this.pose.x, this.pose.z, input.facing, scale, input.dt);
    for (const hand of HANDS) {
      const plant = this.pose.feet[hand];
      this.rig.worldToModel(world[hand], plant.position);
      plant.position.y += 0.075;
      plant.position.lerp(LYING_FEET[hand], 1 - standing);
      plant.yaw = STANCE_FEET[hand].yaw;
    }
    if (standing < 0.5) this.feet.reset();
  }

  private dressFace(input: AnimInput): void {
    const m = this.model.materials;
    m.face.setDamage(input.damageTaken / 40);
    const swell = Math.max(0.01, Math.min(1, (input.damageTaken - 70) / 50));
    this.model.face.swelling.scale.setScalar(swell);
    m.setSweat(0.15 + 0.25 * input.round + 0.2 * (1 - input.fighter.stamina / 100));
    // A blink every few seconds, never in step with the other boxer.
    const blink = (input.time * 0.27 + this.id * 0.41) % 1 < 0.025;
    for (const lid of this.model.face.lids) lid.rotation.x = blink ? 1.55 : 0.5;
    const glow = input.telegraph && this.shape.cock > 0 ? this.shape.cock * (0.35 + 0.25 * Math.sin(input.time * 40)) : 0;
    m.setGlint(glow);
  }
}
