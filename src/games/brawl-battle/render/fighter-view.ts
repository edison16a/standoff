import * as THREE from "three";
import { moveOf } from "../engine/moves";
import type { Fighter, MatchState } from "../engine/types";
import { CHARACTERS } from "../roster";
import { motionPose, type MotionInput } from "./anim/motion";
import { applyPose, approach, restPose, type Pose } from "./anim/pose";
import { strikePose } from "./anim/strike";
import type { Style } from "./anim/style";
import { STYLES } from "./anim/styles";
import type { FighterColours } from "./colors";
import { FighterExtras } from "./fighter-extras";
import { FighterTrails } from "./fighter-trails";
import type { Effects } from "./effects/effects";
import { buildFighter } from "./models/build";
import { solidMaterial } from "./models/geo";
import type { Rig } from "./models/rig";

/** How far the body turns toward the camera from a pure side view, so faces show. */
const CHEAT = 0.4;

/**
 * One fighter on screen: the model, and the animation that follows the
 * engine. Movement poses blend underneath; each move plays on top,
 * timed from the engine's own frame counter so the swing and the damage
 * agree. It also flashes when hit, shivers in hit stop, blinks while
 * invincible, squashes on landings and leaves trails.
 */
export class FighterView {
  readonly rig: Rig;
  readonly extras: FighterExtras;
  private readonly trails: FighterTrails;
  private readonly material = solidMaterial();
  private readonly style: Style;
  private readonly pose: Pose = restPose();
  private readonly target: Pose = restPose();
  private readonly prev = new THREE.Vector2();
  private readonly cur = new THREE.Vector2();
  private yaw: number;
  private stride = 0;
  private flash = 0;
  private squash = 0;
  private flipStart = -999;

  constructor(f: Fighter, colours: FighterColours, glow: THREE.Material, parent: THREE.Object3D, fx: Effects) {
    this.rig = buildFighter(f.character, colours.tint, this.material, glow);
    this.style = STYLES[f.character];
    this.extras = new FighterExtras(f, colours.colour);
    this.trails = new FighterTrails(f, colours.colour, this.rig, fx);
    this.yaw = f.facing * (Math.PI / 2 - CHEAT);
    this.cur.set(f.pos.x, f.pos.y);
    this.prev.copy(this.cur);
    parent.add(this.rig.joints.root, this.extras.group, this.trails.group);
  }

  /** Called before each engine step, so drawing can blend between steps. */
  remember(f: Fighter): void {
    this.prev.set(f.pos.x, f.pos.y);
  }

  onJump(double: boolean, frame: number): void {
    if (double) this.flipStart = frame;
    this.squash = -0.6;
  }

  onLand(): void {
    this.squash = 1;
  }

  /** `glow` is how white the hit flashes, from `hitFlash`. */
  onHit(glow: number): void {
    this.flash = Math.max(this.flash, glow);
  }

  /** `alpha` is how far the screen is between the last engine step and the next. */
  update(f: Fighter, state: MatchState, alpha: number, dt: number, time: number): void {
    const root = this.rig.joints.root;
    const hidden = f.action === "dead" || f.action === "out";
    root.visible = !hidden;
    this.cur.set(f.pos.x, f.pos.y);
    const frozen = f.freeze > 0;
    const k = frozen ? 1 : alpha;
    let x = this.prev.x + (this.cur.x - this.prev.x) * k;
    const y = this.prev.y + (this.cur.y - this.prev.y) * k;
    if (hidden) {
      this.trails.reset();
      this.extras.update(f, x, y, state.stage.surfaces, time);
      return;
    }
    // Hit stop: the struck fighter shivers in place.
    if (frozen && f.action === "hurt") x += Math.sin(time * 95) * 0.07;
    root.position.set(x, y, 0);
    const turn = f.facing * (Math.PI / 2 - CHEAT);
    this.yaw += (turn - this.yaw) * (1 - Math.exp(-22 * dt));
    root.rotation.y = this.yaw;

    const speed = Math.abs(f.vel.x);
    this.stride = (this.stride + (speed * dt) / this.style.stride) % 1;
    const frame = f.frame + (frozen ? 0 : alpha);
    const sinceFlip = state.frame - this.flipStart + alpha;
    const input: MotionInput = {
      action: f.action === "attack" ? (f.ground !== null ? "idle" : "air") : f.action,
      frame,
      speed,
      rise: f.vel.y + f.launch.y,
      stride: this.stride,
      time,
      doubleJump: f.action === "air" && sinceFlip < 24,
      launch: Math.hypot(f.launch.x, f.launch.y),
      winner: state.phase !== "fight" && state.phase !== "ready" && state.winner === f.id,
    };
    if (input.doubleJump) input.frame = sinceFlip;
    motionPose(this.style, input, this.target);
    let rate = 18;
    if (f.action === "attack" && f.move) {
      const anim = this.style.moves[f.move];
      Object.assign(this.target, strikePose(anim, moveOf(f.character, f.move), frame, this.target));
      rate = 40;
    } else if (f.action === "hurt" || input.doubleJump) rate = 30;
    approach(this.pose, this.target, rate, dt);
    applyPose(this.pose, this.rig.joints, this.rig.dims);

    this.squash += (0 - this.squash) * (1 - Math.exp(-12 * dt));
    const s = this.squash;
    root.scale.set(1 + s * 0.12, 1 - s * 0.16, 1 + s * 0.12);
    this.flash = Math.max(0, this.flash - dt * 3.5);
    const blink = f.invincible > 0 && f.action !== "attack" ? (Math.sin(time * 24) > 0 ? 0.45 : 0) : 0;
    const glow = Math.max(this.flash, blink);
    this.material.emissive.setRGB(glow, glow, glow);

    root.updateMatrixWorld(true);
    this.trails.update(f, x, y, time, CHARACTERS[f.character].physique.height);
    this.extras.update(f, x, y, state.stage.surfaces, time);
  }

  dispose(parent: THREE.Object3D): void {
    parent.remove(this.rig.joints.root, this.extras.group, this.trails.group);
    this.rig.dispose();
    this.extras.dispose();
    this.trails.dispose();
    this.material.dispose();
  }
}
