import * as THREE from "three";
import type { BodyPart } from "@/games/blade-clash/engine/body";
import type { FighterAction, FighterFrame } from "@/games/blade-clash/engine/frames";
import type { CharacterModel } from "../characters";
import { emptyPose, type Pose } from "../rig/pose";
import { leanIntoReach, offHandPlaces, type OffHand } from "./arms";
import { Finale } from "./finales";
import { Footwork, STANCE } from "./footwork";
import { Spring } from "./spring";

/** A jump along the line bigger than this is a new bout starting, not a step. */
const TELEPORT = 0.6;

/**
 * Turns the engine's frames into a living body. The sword is the one part
 * it never touches: the grip, blade and edge come straight from the
 * engine, and everything else follows them. Springs carry the spine, hips
 * and head, so the body settles into each new guard, and kicks to those
 * springs are how a hit or a clash knocks it about. The feet step on
 * their own (see footwork) and the endings are laid on top (see finales).
 */
export class Animator {
  readonly pose: Pose = emptyPose();
  private readonly footwork = new Footwork();
  private readonly finale = new Finale();
  private readonly lean = new Spring(0.08, 9, 0.62);
  private readonly tilt = new Spring(0, 9, 0.62);
  private readonly twist = new Spring(0.2, 13, 0.8);
  private readonly hipsY = new Spring(0.9, 12, 0.7);
  private readonly hipsF = new Spring(-0.02, 9, 0.75);
  private readonly hipsYaw = new Spring(0.3, 9, 0.85);
  private readonly nod = new Spring(0, 12, 0.55);
  private readonly turn = new Spring(0, 12, 0.65);
  private readonly offGrip = new Spring(0, 16, 1);
  private readonly offHand: OffHand = { grip: new THREE.Vector3(), canGrip: false, free: new THREE.Vector3() };
  private last: { x: number; action: FighterAction; actionMs: number } | null = null;
  private pendingHurt: { part: BodyPart; across: number } | null = null;
  private clock = 0;

  constructor(private readonly model: CharacterModel) {}

  /** A hit landed at `part`; `across` is where, from -1 on the free side to 1 on the sword side. */
  hurt(part: BodyPart, across: number): void {
    this.pendingHurt = { part, across };
  }

  update(frame: FighterFrame, dtMs: number): Pose {
    const dt = Math.min(0.1, Math.max(0, dtMs / 1000));
    this.clock += dt;
    const fresh = !this.last || Math.abs(frame.x - this.last.x) > TELEPORT || (this.last.action === "defeat" && frame.action !== "defeat");
    if (fresh) this.snap(frame);
    const started = !this.last || frame.action !== this.last.action || frame.actionMs < this.last.actionMs;
    if (started) this.onAction(frame.action);
    this.last = { x: frame.x, action: frame.action, actionMs: frame.actionMs };

    const pose = this.pose;
    this.placeSword(frame);
    const hf = pose.grip.x;
    const hu = pose.grip.y;
    const hr = pose.grip.z;
    const reach = frame.control.reach;
    const walk = Math.max(-1, Math.min(1, frame.speed / 1.7));
    const breathe = Math.sin(this.clock * 1.8);

    if (frame.action !== "defeat") this.footwork.update(frame.x, frame.facing, frame.speed, dt);
    const stride = this.footwork.stride;
    pose.lean = this.lean.update(0.07 + 0.14 * reach + 0.06 * walk + 0.01 * breathe, dt);
    pose.twist = this.twist.update(clamp(0.22 + 0.6 * (hf - 0.33) + 0.75 * (0.2 - hr), -0.5, 1), dt);
    pose.tilt = this.tilt.update(clamp(0.25 * (hr - 0.2), -0.12, 0.12), dt);
    const low = clamp((1.15 - hu) / 0.35, 0, 1);
    pose.hips.set(this.hipsF.update(-0.02 + 0.05 * reach, dt), this.hipsY.update(0.9 - 0.09 * low + 0.006 * breathe - 0.02 * Math.abs(walk), dt) - 0.02 * stride, 0);
    pose.hipsYaw = this.hipsYaw.update(0.28 + 0.35 * pose.twist, dt);
    pose.nod = this.nod.update(0.06 - 0.5 * pose.lean, dt);
    pose.turn = this.turn.update(-0.7 * pose.twist, dt);
    for (const side of ["R", "L"] as const) {
      const ankle = this.footwork.ankle(side, frame.x, frame.facing);
      (side === "R" ? pose.footR : pose.footL).set(ankle.f, ankle.u, ankle.r);
    }
    pose.toeR = STANCE.R.toe;
    pose.toeL = STANCE.L.toe;

    leanIntoReach(pose);
    const places = offHandPlaces(pose, this.model.twoHanded, this.offHand);
    const hold = places.canGrip && frame.action !== "victory" ? 1 : 0;
    pose.offGrip = clamp(this.offGrip.update(hold, dt), 0, 1);
    pose.offHand.copy(places.free).lerp(places.grip, pose.offGrip);

    if (frame.action === "defeat") this.finale.defeat(pose, frame.actionMs);
    if (frame.action === "victory") this.finale.victory(pose, frame.actionMs);
    return pose;
  }

  /** The sword in the fighter's own space, exactly as the engine has it. */
  private placeSword(frame: FighterFrame): void {
    const { hand, dir, edge } = frame.sword;
    const f = frame.facing;
    this.pose.grip.set((hand.x - frame.x) * f, hand.y, hand.z * f);
    this.pose.blade.set(dir.x * f, dir.y, dir.z * f);
    this.pose.edge.set(edge.x * f, edge.y, edge.z * f);
    this.pose.hand.copy(this.pose.grip);
    this.pose.holding = true;
  }

  /** What starting a new action does to the body. */
  private onAction(action: FighterAction): void {
    if (action === "hit") {
      const { part, across } = this.pendingHurt ?? { part: "torso" as const, across: 0 };
      if (part === "head") {
        this.nod.kick(-9);
        this.lean.kick(-3);
        this.turn.kick(-across * 5);
      } else if (part === "legs") {
        this.hipsY.kick(-1.1);
        this.lean.kick(2.5);
      } else {
        this.lean.kick(-6);
        this.hipsF.kick(-0.9);
        this.twist.kick(-across * 3);
      }
      this.tilt.kick(-across * 2.5);
    }
    if (action === "stagger") {
      this.lean.kick(-3.2);
      this.hipsF.kick(-0.5);
      this.twist.kick(-2.5);
    }
    this.pendingHurt = null;
  }

  /** Straight into a stance with nothing carried over, for a fighter appearing or a new bout. */
  private snap(frame: FighterFrame): void {
    this.footwork.reset(frame.x, frame.facing);
    this.finale.reset();
    for (const spring of [this.lean, this.tilt, this.twist, this.hipsY, this.hipsF, this.hipsYaw, this.nod, this.turn, this.offGrip]) spring.velocity = 0;
    this.hipsY.snap(0.9);
    this.offGrip.snap(this.model.twoHanded ? 1 : 0);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
