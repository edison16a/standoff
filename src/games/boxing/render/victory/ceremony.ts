import * as THREE from "three";
import { createBoxingBelt, disposeTree, StageLights } from "@/games/kit/victory";
import { CORNERS } from "../../engine/footwork";
import { other, type FighterId } from "../../engine/types";
import type { AnimMode } from "../anim/anim-input";
import { championFrame } from "./champion-pose";

/** Where a boxer stands in the ceremony, which way they face, and what they do. */
export interface Staging {
  x: number;
  z: number;
  facing: number;
  mode: AnimMode;
}

/** How far the loser sits back into their corner, as a share of the way to the post. */
const INTO_CORNER = 0.93;
/** The champion turns a little off the line to the loser's corner, so the loser shows behind them. */
const OFF_LINE = 0.5;

/**
 * The winner's ceremony after the fight: the champion in the middle of
 * the ring lifting the belt, the loser slumped on the ropes in their
 * corner, and spotlights on the champion. It places the belt between
 * the champion's gloves every frame, so it rises with the real lift.
 */
export class Ceremony {
  readonly group = new THREE.Group();
  readonly belt: THREE.Group;
  readonly lights: StageLights;
  winner: FighterId | null = null;
  private startedAt = 0;
  private level = 0;
  private readonly x = new THREE.Vector3();
  private readonly y = new THREE.Vector3();
  private readonly z = new THREE.Vector3();
  private readonly basis = new THREE.Matrix4();

  constructor() {
    this.belt = createBoxingBelt({ bend: 0.16 });
    this.belt.visible = false;
    this.lights = new StageLights({ count: 4, colours: ["#fff3dc", "#ffd27a"], radius: 4.2, height: 8.5, intensity: 1500, angle: 0.19, beamStrength: 0.2, sweep: 0.2 });
    this.lights.setLevel(0);
    this.lights.aimAt(new THREE.Vector3(0, 0, 0));
    this.group.add(this.belt, this.lights.object);
  }

  get active(): boolean {
    return this.winner !== null;
  }

  start(winner: FighterId, time: number): void {
    this.winner = winner;
    this.startedAt = time;
    this.level = 0;
    this.belt.visible = true;
  }

  stop(): void {
    this.winner = null;
    this.belt.visible = false;
    this.lights.setLevel(0);
  }

  /** Seconds into the ceremony. */
  seconds(time: number): number {
    return Math.max(0, time - this.startedAt);
  }

  /** Which way the champion faces: away from the loser's corner, a little off the line. */
  get front(): number {
    if (this.winner === null) return 0;
    const corner = CORNERS[other(this.winner)];
    return Math.atan2(-corner.x, -corner.z) + OFF_LINE;
  }

  /** The champion turns a little either way once the belt is up, to show it round the arena. */
  facing(time: number): number {
    return this.front + championFrame(this.seconds(time)).turn;
  }

  /** Where a boxer is placed, or null outside the ceremony. */
  stage(id: FighterId, time: number): Staging | null {
    if (this.winner === null) return null;
    if (id === this.winner) return { x: 0, z: 0, facing: this.facing(time), mode: "champion" };
    const corner = CORNERS[id];
    return { x: corner.x * INTO_CORNER, z: corner.z * INTO_CORNER, facing: Math.atan2(-corner.x, -corner.z), mode: "ropes" };
  }

  /** Every frame: fades the spotlights up and hangs the belt between the champion's wrists. */
  update(time: number, dt: number, left: THREE.Vector3, right: THREE.Vector3): void {
    if (this.winner === null) return;
    this.level = Math.min(1, this.level + dt / 1.2);
    this.lights.setLevel(this.level);
    this.lights.update(time, dt);
    // The belt's x runs from the right hand to the left, its face forward, square to the gloves.
    this.x.copy(left).sub(right).normalize();
    const facing = this.facing(time);
    this.z.set(Math.sin(facing), 0, Math.cos(facing));
    this.z.addScaledVector(this.x, -this.z.dot(this.x)).normalize();
    this.y.crossVectors(this.z, this.x);
    this.basis.makeBasis(this.x, this.y, this.z);
    this.belt.quaternion.setFromRotationMatrix(this.basis);
    this.belt.position.copy(left).add(right).multiplyScalar(0.5).addScaledVector(this.z, 0.05);
  }

  dispose(): void {
    this.lights.dispose();
    disposeTree(this.belt);
  }
}
