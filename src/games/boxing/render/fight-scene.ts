import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";
import { other, type FighterId, type Hand } from "../engine/types";
import type { AnimMode, MirrorInput } from "./anim/anim-input";
import { BoxerAnimator } from "./anim/boxer-animator";
import { RefereeAnimator } from "./anim/referee-animator";
import { Arena } from "./arena/arena";
import { Confetti } from "./fx/confetti";
import { HitFx } from "./fx/hit-fx";
import { BoxerModel } from "./models/boxer-model";
import type { Look } from "./models/looks";

/** What the scene needs each frame beyond the match itself. */
export interface SceneInput {
  /** Each player's own arms and body from the camera, or null for a computer boxer. */
  mirrors: readonly [MirrorInput | null, MirrorInput | null];
  /** Light the gloves while winding up: on for computer boxers, so players can read them. */
  telegraph: readonly [boolean, boolean];
}


/**
 * The whole 3D world of a fight: the arena, both boxers and the effects.
 * It reads the match every frame and reacts to its events, and it knows
 * nothing about players, cameras or screens, so the live fight, the
 * replay and the showcase all draw through it.
 */
export class FightScene {
  readonly scene = new THREE.Scene();
  readonly arena = new Arena();
  readonly fx = new HitFx();
  readonly confetti = new Confetti();
  readonly referee = new RefereeAnimator();
  models: [BoxerModel, BoxerModel];
  animators: [BoxerAnimator, BoxerAnimator];
  /** How worked up the crowd is, 0 to 1. It jumps on big moments and settles. */
  excite = 0.2;
  private readonly environment: THREE.Texture;
  private readonly faces: [THREE.Vector3, THREE.Vector3] = [new THREE.Vector3(), new THREE.Vector3()];
  private readonly tmp = new THREE.Vector3();

  constructor(renderer: THREE.WebGLRenderer, looks: readonly [Look, Look]) {
    this.scene.background = new THREE.Color("#05060b");
    this.scene.fog = new THREE.Fog("#05060b", 14, 34);
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = 0.25;
    this.scene.add(this.arena.group, this.fx.group, this.confetti.mesh, this.referee.model.root);
    this.models = [new BoxerModel(looks[0]), new BoxerModel(looks[1])];
    this.animators = [new BoxerAnimator(this.models[0], 0), new BoxerAnimator(this.models[1], 1)];
    for (const model of this.models) this.scene.add(model.root);
  }

  /** Swaps in new boxers, as after the players pick theirs. */
  setLooks(looks: readonly [Look, Look]): void {
    ([0, 1] as const).forEach((id) => {
      if (this.models[id].look.id === looks[id].id) return;
      this.scene.remove(this.models[id].root);
      this.models[id].dispose();
      this.models[id] = new BoxerModel(looks[id]);
      this.animators[id] = new BoxerAnimator(this.models[id], id);
      this.scene.add(this.models[id].root);
    });
  }

  /** Fresh animation for both boxers, as when the showcase starts its loop again. */
  resetAnimation(): void {
    this.animators = [new BoxerAnimator(this.models[0], 0), new BoxerAnimator(this.models[1], 1)];
    this.fx.clear();
    this.confetti.clear();
  }

  update(match: Match, input: SceneInput, time: number, dt: number): void {
    for (const id of [0, 1] as const) this.animators[id].face(this.faces[id]);
    for (const id of [0, 1] as const) {
      const fighter = match.fighters[id];
      const them = match.fighters[other(id)];
      const spot = match.footwork.spots[id];
      this.animators[id].update({
        now: match.now,
        time,
        dt,
        x: spot.x,
        z: spot.z,
        facing: match.footwork.facing(id),
        fighter,
        damageTaken: them.stats.damage,
        round: match.round,
        opponentFace: this.faces[other(id)],
        opponentBlocking: them.blocking(match.now),
        mode: modeFor(match, id),
        mirror: input.mirrors[id],
        telegraph: input.telegraph[id],
      });
    }
    this.referee.update(match, time, dt);
    this.excite += (0.2 - this.excite) * Math.min(1, dt * 0.5);
    this.animate(time, dt);
  }

  /** Effects, crowd and confetti only, for the replay, where the boxers are posed from a recording. */
  animate(time: number, dt: number): void {
    this.arena.update(time, dt, this.excite);
    this.fx.update(dt);
    this.confetti.update(dt, time);
  }

  onEvent(event: MatchEvent): void {
    for (const animator of this.animators) animator.onEvent(event);
    if (event.type === "hit") {
      const power = event.damage / 6 + (event.counter ? 0.6 : 0);
      this.impact(event.target, event.fighter, power, false);
      this.excite = Math.min(1, this.excite + 0.12 + power * 0.12);
    }
    if (event.type === "block") this.impact(event.target, event.fighter, 0.5, true);
    if (event.type === "knockdown") {
      this.excite = 1;
      this.arena.burst(30);
    }
    if (event.type === "over") {
      this.excite = 1;
      this.arena.burst(40);
    }
  }

  /** Sparks and sweat where a punch met the head, or a smaller burst off the gloves on a block. */
  impact(target: FighterId, from: FighterId, power: number, blocked: boolean): void {
    const at = this.animators[target].face(new THREE.Vector3());
    const direction = at.clone().sub(this.animators[from].face(this.tmp)).setY(0).normalize();
    if (blocked) {
      // The gloves are just in front of the face.
      this.fx.block(at.addScaledVector(direction, -0.14), direction);
    } else {
      // Sparks start where the glove meets the face, on the side the punch came from, so the head never hides them.
      this.fx.hit(at.addScaledVector(direction, -0.09), direction, power);
    }
  }

  /** Where a boxer's glove is in the world, for close ups. */
  glove(id: FighterId, hand: Hand, out: THREE.Vector3): THREE.Vector3 {
    return this.models[id].arms[hand].end.getWorldPosition(out);
  }

  /** A view's focal length and size in pixels, so sprites and streaks are sized right in it. */
  setView(focal: number, width: number, height: number): void {
    this.arena.setViewHeight(focal);
    this.fx.setView(focal, width, height);
  }

  dispose(): void {
    this.arena.dispose();
    this.fx.dispose();
    this.confetti.dispose();
    for (const model of this.models) model.dispose();
    this.referee.dispose();
    this.environment.dispose();
  }
}


function modeFor(match: Match, id: FighterId): AnimMode {
  if (match.phase === "break") return "corner";
  if (match.phase === "over" && match.result) {
    if (match.result.winner === null) return "corner";
    return match.result.winner === id ? "win" : "lose";
  }
  return "fight";
}
