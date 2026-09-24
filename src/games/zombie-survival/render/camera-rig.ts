import * as THREE from "three";
import { chopperPose } from "../engine/chopper";
import type { SurvivalGame } from "../engine/game";
import { checkpointDistance, fightFrame, pointAt, type Vec3 } from "../engine/route";
import { CHOPPER_STAGE, STAGE_COUNT } from "../engine/stages";
import { SHIP_DECK } from "./models/vehicles/ship";

const EYE = 1.65;
const v = (p: Vec3, up = 0) => new THREE.Vector3(p.x, p.y + up, p.z);

/** How far the ship has sailed, in metres, this many seconds into the escape. */
export function sailed(t: number): number {
  const s = Math.max(0, t - 10);
  return s * s * 0.35 + s * 0.8;
}

/**
 * Where the team's eyes are. Walking, the view bobs along the route and
 * looks ahead round corners. Fighting, it stands at the checkpoint facing
 * the road the zombies come down. In the cutscenes it follows the chopper
 * down, then walks the pier onto the ship and looks back as it sails.
 * Everything eases, so a phase change never snaps the view.
 */
export class CameraRig {
  private readonly pos = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private shake = 0;
  private bob = 0;
  private started = false;

  kick(amount: number): void {
    this.shake = Math.min(1, this.shake + amount);
  }

  update(camera: THREE.PerspectiveCamera, game: SurvivalGame, dt: number, time: number): void {
    const { pos, look } = this.target(game, dt, time);
    const jump = !this.started || pos.distanceTo(this.pos) > 12;
    this.started = true;
    const k = jump ? 1 : 1 - Math.exp(-dt * 6);
    this.pos.lerp(pos, k);
    this.look.lerp(look, jump ? 1 : 1 - Math.exp(-dt * 4));
    this.shake = Math.max(0, this.shake - dt * 2.2);
    const s = this.shake * this.shake * 0.18;
    camera.position.set(this.pos.x + (Math.random() - 0.5) * s, this.pos.y + (Math.random() - 0.5) * s, this.pos.z + (Math.random() - 0.5) * s);
    camera.lookAt(this.look);
  }

  private target(game: SurvivalGame, dt: number, time: number): { pos: THREE.Vector3; look: THREE.Vector3 } {
    const breathe = new THREE.Vector3(Math.sin(time * 0.6) * 0.03, Math.sin(time * 0.9) * 0.025, 0);
    switch (game.phase) {
      case "lobby":
        return { pos: v(pointAt(3), EYE).add(breathe), look: v(pointAt(22), 1.3 + Math.sin(time * 0.2) * 0.2) };
      case "travel": {
        this.bob += dt * 7.2;
        const pos = v(pointAt(game.distance), EYE + Math.sin(this.bob * 2) * 0.035);
        const ahead = v(pointAt(game.distance + 8), 1.5);
        const right = new THREE.Vector3().subVectors(ahead, pos).cross(new THREE.Vector3(0, 1, 0)).normalize();
        return { pos: pos.addScaledVector(right, Math.sin(this.bob) * 0.04), look: ahead };
      }
      case "cutscene":
        return game.cutscene === "escape" ? this.escape(game.phaseTime) : this.chopper(game, breathe);
      case "escaped":
        return this.escape(13 + game.phaseTime);
      default: {
        const frame = fightFrame(game.stage);
        const pos = v(frame.origin, EYE).add(breathe);
        const chopper = game.stage === CHOPPER_STAGE ? this.chopper(game, breathe) : null;
        return { pos, look: chopper && game.phase === "clear" ? chopper.look : v(frame.place(14, 0), 1.45) };
      }
    }
  }

  /** Watching the chopper come in, catch fire and fall. */
  private chopper(game: SurvivalGame, breathe: THREE.Vector3): { pos: THREE.Vector3; look: THREE.Vector3 } {
    const frame = fightFrame(CHOPPER_STAGE);
    const pos = v(frame.origin, EYE).add(breathe);
    const pose = chopperPose(game.phase, game.stage, game.cutscene, game.phaseTime);
    if (!pose) return { pos, look: v(frame.place(14, 0), 1.5) };
    const at = frame.place(pose.ahead, pose.side);
    const look = new THREE.Vector3(at.x, frame.origin.y + Math.max(pose.up, -6) + 1, at.z);
    return { pos, look };
  }

  /** Up the pier, up the gangway, then turn and watch the city fall away. */
  private escape(t: number): { pos: THREE.Vector3; look: THREE.Vector3 } {
    const frame = fightFrame(STAGE_COUNT);
    const pier = checkpointDistance(STAGE_COUNT + 1) - checkpointDistance(STAGE_COUNT);
    const walk = Math.min(pier - 1, t * 6.2);
    const climb = THREE.MathUtils.smoothstep(t, 8, 10.5);
    const ahead = walk + climb * 8;
    const deck = frame.origin.y + climb * (SHIP_DECK - 2.2);
    const drift = sailed(t);
    const base = frame.place(ahead, 0);
    const pos = new THREE.Vector3(base.x + frame.right.x * drift, deck + EYE, base.z + frame.right.z * drift);
    const turn = THREE.MathUtils.smoothstep(t, 10, 12.5);
    const forward = frame.place(ahead + 20, 0);
    const back = frame.place(-40, -drift * 0.3);
    const look = new THREE.Vector3(
      THREE.MathUtils.lerp(forward.x + frame.right.x * drift, back.x, turn),
      deck + 2 + turn * 4,
      THREE.MathUtils.lerp(forward.z + frame.right.z * drift, back.z, turn),
    );
    return { pos, look };
  }
}
