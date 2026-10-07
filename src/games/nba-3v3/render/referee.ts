import * as THREE from "three";
import type { FoulCall } from "../engine/foul-call";
import { callSpot } from "../engine/free-throw-ref";
import type { Match } from "../engine/match";
import { angleDiff, clamp } from "../engine/vec";
import { applyPose, approach, keyed, STAND, type Pose } from "./anim/pose";
import type { AthleteMaterials } from "./materials/athlete-materials";
import type { Joints } from "./models/athlete-model";
import { buildReferee, type RefereeModel } from "./referee-model";
import { officialPose, strideStep } from "./referee-official";
import { COUNTS, SIGNAL } from "./referee-signals";

const POP_IN = 0.28;
const POP_OUT = 0.22;

/** easeOutBack: overshoots a touch, so he pops in rather than fading. */
const pop = (u: number) => {
  const k = clamp(u, 0, 1) - 1;
  return 1 + 2.2 * k * k * k + 1.2 * k * k;
};

/** The legs follow the gait straight away; easing them would drag the feet. */
const LEGS = ["legLLift", "legRLift", "kneeL", "kneeR", "footL", "footR", "legLSpread", "legRSpread", "hipY"] as const;

/**
 * The referee who comes on at every foul. He pops in beside the play,
 * facing the camera and turned toward the foul, blows the whistle with a
 * fist in the air and makes the signal: a chop on the wrist for a reach
 * in, the arm held up for the shots on a shooting foul, hands on the hips
 * for a block, the fist into the palm for a charge, and a swing of the
 * arm when a fouled shot still counts. On free throws he stays on and
 * works the line where the match puts him (`engine/free-throw-ref.ts`):
 * to the baseline, then after each shot but the last he fetches the
 * ball and bounce passes it back. He goes once play is live again.
 */
export class Referee {
  private readonly ref: RefereeModel;
  private readonly pose: Pose = { ...STAND };
  private call: FoulCall | null = null;
  private callT = 0;
  private andOneAt: number | null = null;
  private shownFor = 0;
  private leaving = 0;
  private yaw = 0;
  private stride = 0;
  private time = 0;

  constructor(mats: AthleteMaterials, private readonly parent: THREE.Object3D) {
    this.ref = buildReferee(mats);
    this.ref.model.joints.root.visible = false;
    parent.add(this.ref.model.joints.root);
  }

  /** The referee's bones while he is on the floor, for his contact shadow, or null. */
  get joints(): Joints | null {
    const j = this.ref.model.joints;
    return j.root.visible ? j : null;
  }

  update(m: Match, dt: number): void {
    const root = this.ref.model.joints.root;
    const call = m.foulCall;
    const o = m.phase === "freeThrow" ? (m.freeThrows?.official ?? null) : null;
    this.time += dt;
    if (call && call !== this.call) {
      this.call = call;
      this.callT = 0;
      this.andOneAt = null;
      if (!o) this.placeAt(callSpot(call.spot));
    }
    if ((call || o) && !root.visible) this.appear(o ?? callSpot(call!.spot));
    if (!root.visible) return;
    if (call || o) {
      this.shownFor += dt;
      this.leaving = 0;
    } else this.leaving += dt;
    if (this.leaving >= POP_OUT) {
      root.visible = false;
      this.call = null;
      return;
    }
    if (call) this.callT += dt;
    if (call?.andOne && this.andOneAt === null) this.andOneAt = this.callT;
    let target: Pose = STAND;
    if (call) target = this.andOneAt !== null ? keyed(COUNTS, this.callT - this.andOneAt, STAND) : keyed(SIGNAL[call.kind], this.callT, STAND);
    else if (o) {
      root.position.set(o.x, 0, o.z);
      this.yaw += angleDiff(this.yaw, o.yaw) * Math.min(1, dt * 12);
      this.stride = strideStep(this.stride, o.speed, dt);
      target = officialPose(o, this.stride, this.time);
    }
    approach(this.pose, target, 22, dt);
    if (o && !call) for (const c of LEGS) this.pose[c] = target[c];
    const scale = pop(this.shownFor / POP_IN) * (1 - clamp(this.leaving / POP_OUT, 0, 1));
    root.scale.setScalar(Math.max(0.001, scale));
    applyPose(this.pose, this.ref.model.joints, this.ref.model.dims);
    root.rotation.y = this.yaw;
    root.updateMatrixWorld(true);
  }

  private appear(at: { x: number; z: number; yaw: number }): void {
    this.ref.model.joints.root.visible = true;
    this.shownFor = 0;
    this.leaving = 0;
    this.placeAt(at);
    Object.assign(this.pose, STAND);
  }

  private placeAt(at: { x: number; z: number; yaw: number }): void {
    this.ref.model.joints.root.position.set(at.x, 0, at.z);
    this.yaw = at.yaw;
  }

  dispose(): void {
    this.parent.remove(this.ref.model.joints.root);
    this.ref.dispose();
  }
}
