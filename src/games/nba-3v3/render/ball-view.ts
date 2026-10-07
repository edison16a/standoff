import * as THREE from "three";
import type { Ball } from "../engine/types";
import { spinCarry } from "../engine/dribble-ball";
import { BALL } from "../engine/tuning";
import type { AthleteView } from "./athlete-view";
import { ballSkin } from "./ball-skin";
import { Squash } from "./ball-squash";

const left = new THREE.Vector3();
const right = new THREE.Vector3();
const palm = new THREE.Vector3();
const axis = new THREE.Vector3();
const spinQ = new THREE.Quaternion();
const inverse = new THREE.Quaternion();

/** A jump in the engine's ball bigger than this in one frame is a change of hands, eased rather than shown. */
const JUMP = 0.35;

/**
 * The ball: two tone pebbled leather (see `ball-skin.ts`), turning with
 * the real spin the physics gives it, so backspin on a jumper, the kick
 * off the iron and the roll on the floor all show. It flattens for an
 * instant against whatever it hits. In the hands it sits between them;
 * on the dribble it rides the drawn palm down and flies free on the
 * engine's path to the floor and back. Whenever it changes hands it
 * eases from where it was drawn onto the new path, so it never jumps.
 */
export class BallView {
  /** Placed at the ball, and turned and stretched for the squash. */
  readonly mesh = new THREE.Group();
  private readonly leather: THREE.Mesh;
  private readonly squash = new Squash();
  /** The ball's own turn, in the world, kept apart from the squash's frame. */
  private readonly turn = new THREE.Quaternion();
  private readonly offset = new THREE.Vector3();
  private readonly lastTarget = new THREE.Vector3();
  private lastHand = "";
  private fresh = true;

  constructor() {
    const skin = ballSkin();
    const material = new THREE.MeshStandardMaterial({ map: skin.map, bumpMap: skin.bump, bumpScale: 1.2, roughness: 0.58, metalness: 0 });
    this.leather = new THREE.Mesh(new THREE.SphereGeometry(BALL.radius, 48, 32), material);
    this.leather.castShadow = true;
    this.mesh.add(this.leather);
  }

  /** A new game: the ball is drawn straight where it is, not eased over from the last one. */
  reset(): void {
    this.fresh = true;
  }

  /** `chest` is true while the holder has it in both hands at the chest, as in a check. */
  update(ball: Ball, holder: AthleteView | null, chest: boolean, dt: number): void {
    const a = holder?.athlete;
    const carry = !!a && spinCarry(a);
    const hand = carry ? "carry" : chest && holder ? "held" : ball.hand;
    const target = new THREE.Vector3(ball.pos.x, ball.pos.y, ball.pos.z);
    // At the rim the engine's ball is the hands' ball: the drawn hands are put on it, not the other way round.
    const atRim = a?.action.kind === "drive";
    if (!atRim && holder && a && (hand === "carry" || hand === "dribble")) {
      // Pulled round through a spin, or riding the push of a dribble, the ball is under the dribbling palm.
      holder.hand(a.dribbleHand === 1 ? "R" : "L", palm);
      target.copy(palm);
      target.y -= BALL.radius * 0.85;
    } else if (!atRim && holder && hand === "held") {
      holder.hand("L", left);
      holder.hand("R", right);
      // Two hands close together hold it between them; as they part it slides into the right palm, never jumping across.
      const apart = Math.min(1, Math.max(0, (left.distanceTo(right) - 0.34) / 0.16));
      target.copy(left).lerp(right, 0.5 + 0.5 * apart * apart * (3 - 2 * apart));
      target.y += 0.02;
    }
    const travel = Math.hypot(ball.vel.x, ball.vel.y, ball.vel.z) * dt * 1.5;
    if (this.fresh) this.offset.set(0, 0, 0);
    else if (hand !== this.lastHand || target.distanceTo(this.lastTarget) > JUMP + travel) {
      // Let go, caught, or passed to another hand: start from where the ball was drawn and blend onto the new path.
      this.offset.copy(this.mesh.position).sub(target);
    }
    this.fresh = false;
    this.lastHand = hand;
    this.lastTarget.copy(target);
    this.offset.multiplyScalar(Math.exp(-dt * 16));
    this.mesh.position.copy(target).add(this.offset);
    this.spin(ball, hand, dt);
    this.squash.update(ball, hand === "none" || hand === "free");
    this.squash.apply(this.mesh, BALL.radius);
    // The leather turns in the world whatever way the squash frame points.
    this.leather.quaternion.copy(inverse.copy(this.mesh.quaternion).invert()).multiply(this.turn);
  }

  /** Free, the ball turns with the physics' spin; in the hands it turns with them and does not roll. */
  private spin(ball: Ball, hand: string, dt: number): void {
    if (hand === "held" || hand === "carry") return;
    const w = ball.w;
    const rate = Math.hypot(w.x, w.y, w.z);
    if (rate < 0.05) return;
    axis.set(w.x / rate, w.y / rate, w.z / rate);
    spinQ.setFromAxisAngle(axis, rate * dt);
    this.turn.premultiply(spinQ).normalize();
  }

  dispose(): void {
    this.leather.geometry.dispose();
    const m = this.leather.material as THREE.MeshStandardMaterial;
    m.map?.dispose();
    m.bumpMap?.dispose();
    m.dispose();
  }
}
