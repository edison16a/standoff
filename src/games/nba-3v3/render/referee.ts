import * as THREE from "three";
import type { FoulCall } from "../engine/foul-call";
import type { Match } from "../engine/match";
import { COURT } from "../engine/tuning";
import { angleDiff, clamp, yawOf } from "../engine/vec";
import { applyPose, approach, keyed, STAND, type Pose, type PosePatch } from "./anim/pose";
import { buildReferee, type RefereeModel } from "./referee-model";

type Keys = readonly (readonly [number, PosePatch])[];

/** Whistle in: the right fist shoots straight up, the body tall. */
const FIST_UP: PosePatch = { armRRaise: 3.0, armRSpread: 0.08, elbowR: 0.05, wristR: 0, armLRaise: 0.15, elbowL: 0.3, torsoX: -0.04, neckX: -0.08 };
/** The left arm out in front, palm down, to be struck. */
const WRIST_OUT: PosePatch = { armLRaise: 1.45, armLSpread: -0.25, elbowL: 0.25, wristL: 0 };
const CHOP_UP: PosePatch = { armRRaise: 1.95, armRSpread: -0.15, elbowR: 0.9 };
const CHOP_DOWN: PosePatch = { armRRaise: 1.35, armRSpread: -0.3, elbowR: 0.35 };

/** Illegal use of the hands: fist up, then the right hand chops the left wrist, twice. */
const REACH: Keys = [
  [0, FIST_UP],
  [0.55, FIST_UP],
  [0.8, { ...WRIST_OUT, ...CHOP_UP, torsoX: 0.08 }],
  [0.95, CHOP_DOWN],
  [1.1, CHOP_UP],
  [1.25, CHOP_DOWN],
  [1.6, CHOP_DOWN],
  [1.9, { armLRaise: 0.9, elbowL: 0.6, armRRaise: 1.2, armRSpread: 0.3, elbowR: 0.4, torsoX: 0.02 }],
];

/** On a shot: the wrist chop, then the arm held up for the shots, fingers out. */
const SHOOTING: Keys = [
  ...REACH.slice(0, 6),
  [1.5, { armLRaise: 0.2, elbowL: 0.3, armRRaise: 2.7, armRSpread: 0.35, elbowR: 0.15, wristR: -0.3 }],
  [2.4, { armRRaise: 2.7 }],
];

/** Both hands on the hips, elbows out. */
const HIPS: PosePatch = { armLRaise: -0.15, armLSpread: 0.75, armLTwist: 1.2, elbowL: 1.7, armRRaise: -0.15, armRSpread: 0.75, armRTwist: 1.2, elbowR: 1.7, torsoX: -0.02 };

/** A blocking foul: fist up, both hands on the hips, then the arm held up for the shots. */
const BLOCK: Keys = [
  [0, FIST_UP],
  [0.55, FIST_UP],
  [0.85, HIPS],
  [1.5, HIPS],
  [1.8, { armLRaise: 0.2, armLSpread: 0.12, armLTwist: 0, elbowL: 0.3, armRRaise: 2.7, armRSpread: 0.35, armRTwist: 0, elbowR: 0.15, wristR: -0.3 }],
  [2.4, { armRRaise: 2.7 }],
];

/** The left palm open in front of the chest, the right fist drawn back. */
const PALM: PosePatch = { armLRaise: 1.3, armLSpread: -0.35, elbowL: 1.2, wristL: 0.2, armRRaise: 1.05, armRSpread: 0.35, elbowR: 1.7 };
const PUNCH: PosePatch = { armRRaise: 1.35, armRSpread: -0.2, elbowR: 0.75, torsoX: 0.08 };

/** A charge: fist up, the fist punched into the open palm twice, then the arm out to the other team's way. */
const CHARGE_CALL: Keys = [
  [0, FIST_UP],
  [0.55, FIST_UP],
  [0.8, PALM],
  [0.95, PUNCH],
  [1.1, PALM],
  [1.25, PUNCH],
  [1.5, PUNCH],
  [1.8, { armLRaise: 0.15, armLSpread: 0.12, elbowL: 0.3, wristL: 0, armRRaise: 1.55, armRSpread: 1.3, elbowR: 0.08, torsoX: 0 }],
];

const SIGNAL: Record<FoulCall["kind"], Keys> = { reach: REACH, shooting: SHOOTING, block: BLOCK, charge: CHARGE_CALL };

/** The basket counts: the right arm swung down across the body, twice, like a scoring call. */
const COUNTS: Keys = [
  [0, { armRRaise: 2.6, armRSpread: 0.1, elbowR: 0.2 }],
  [0.2, { armRRaise: 0.9, armRSpread: -0.4, elbowR: 0.1, torsoX: 0.12 }],
  [0.45, { armRRaise: 2.6, armRSpread: 0.1, elbowR: 0.2, torsoX: 0 }],
  [0.65, { armRRaise: 0.9, armRSpread: -0.4, elbowR: 0.1, torsoX: 0.12 }],
  [1.2, { armRRaise: 0.6, armRSpread: 0.1, elbowR: 0.3, torsoX: 0.02 }],
];

const POP_IN = 0.28;
const POP_OUT = 0.22;

/** easeOutBack: overshoots a touch, so he pops in rather than fading. */
const pop = (u: number) => {
  const k = clamp(u, 0, 1) - 1;
  return 1 + 2.2 * k * k * k + 1.2 * k * k;
};

/**
 * The referee who comes on at every foul. He pops in beside the play,
 * facing the camera and turned toward the foul, blows the whistle with a
 * fist in the air and makes the signal: a chop on the wrist for a reach
 * in, the arm held up for the shots on a shooting foul, hands on the hips
 * for a block, the fist into the palm for a charge, and a swing of the
 * arm when a fouled shot still counts. He goes again as the players
 * walk to the line.
 */
export class Referee {
  private readonly ref: RefereeModel;
  private readonly pose: Pose = { ...STAND };
  private call: FoulCall | null = null;
  private andOneAt: number | null = null;
  private shownFor = 0;
  private leaving = 0;
  private yaw = 0;

  constructor(bodyMat: THREE.Material, private readonly parent: THREE.Object3D) {
    this.ref = buildReferee(bodyMat);
    this.ref.model.joints.root.visible = false;
    parent.add(this.ref.model.joints.root);
  }

  update(m: Match, dt: number): void {
    const root = this.ref.model.joints.root;
    const call = m.foulCall;
    if (call && call !== this.call) {
      this.call = call;
      this.shownFor = 0;
      this.andOneAt = null;
      this.leaving = 0;
      this.place(call);
    }
    if (!this.call) return;
    if (!call) this.leaving += dt;
    else this.shownFor += dt;
    if (this.call.andOne && this.andOneAt === null) this.andOneAt = this.shownFor;
    const scale = pop(this.shownFor / POP_IN) * (1 - clamp(this.leaving / POP_OUT, 0, 1));
    if (this.leaving >= POP_OUT) {
      root.visible = false;
      this.call = null;
      return;
    }
    root.visible = true;
    root.scale.setScalar(Math.max(0.001, scale));
    const target = this.andOneAt !== null ? keyed(COUNTS, this.shownFor - this.andOneAt, STAND) : keyed(SIGNAL[this.call.kind], this.shownFor, STAND);
    approach(this.pose, target, 22, dt);
    applyPose(this.pose, this.ref.model.joints, this.ref.model.dims);
    root.rotation.y = this.yaw;
    root.updateMatrixWorld(true);
  }

  /** Beside the foul on the camera's side, facing out toward the camera and turned toward the play. */
  private place(call: FoulCall): void {
    const root = this.ref.model.joints.root;
    const side = call.spot.x > 0 ? -1 : 1;
    const x = clamp(call.spot.x + side * 1.7, -COURT.halfWidth + 0.6, COURT.halfWidth - 0.6);
    const z = clamp(call.spot.z + 1.6, 1.2, COURT.depth + 0.8);
    root.position.set(x, 0, z);
    const toward = yawOf(call.spot.x - x, call.spot.z - z);
    this.yaw = angleDiff(0, toward) * 0.4;
    Object.assign(this.pose, STAND);
  }

  dispose(): void {
    this.parent.remove(this.ref.model.joints.root);
    this.ref.dispose();
  }
}
