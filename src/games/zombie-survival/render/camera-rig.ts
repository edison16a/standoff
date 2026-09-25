import * as THREE from "three";
import { chopperPose } from "../engine/chopper";
import type { SurvivalGame } from "../engine/game";
import { STEP_SECONDS } from "../engine/pacing";
import { checkpointDistance, fightFrame, pointAt, type Vec3 } from "../engine/route";
import { CHOPPER_STAGE, STAGE_COUNT } from "../engine/stages";
import { alive } from "../engine/zombie";
import { isBoss, KINDS } from "../engine/zombie-kinds";
import { SHIP_DECK } from "./models/vehicles/ship";

const EYE = 1.65;
const v = (p: Vec3, up = 0) => new THREE.Vector3(p.x, p.y + up, p.z);

/**
 * How high to look, fourteen metres out, during a fight. Normally just
 * under eye level. A boss that closes in tilts the view up with it, so
 * the weak points on its shoulders stay on screen to be shot.
 */
function lookHeight(game: SurvivalGame): number {
  const boss = game.encounter?.zombies.find((z) => isBoss(z.kind) && alive(z));
  const base = 1.45;
  if (!boss || boss.ahead > 16) return base;
  const chest = KINDS[boss.kind].height * 0.62;
  const raised = EYE + ((chest - EYE) * 14) / Math.max(3, boss.ahead);
  const k = Math.min(1, (16 - boss.ahead) / 10);
  return base + (raised - base) * k;
}

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

  /** `random` drives the shake. The showcase seeds it, so its clip plays the same each time. */
  constructor(private readonly random: () => number = Math.random) {}

  kick(amount: number): void {
    this.shake = Math.min(1, this.shake + amount);
  }

  update(camera: THREE.PerspectiveCamera, game: SurvivalGame, dt: number, time: number): void {
    const { pos, look } = this.target(game, dt, time);
    const jump = !this.started || pos.distanceTo(this.pos) > 12;
    this.started = true;
    const k = jump ? 1 : 1 - Math.exp(-dt * 6);
    this.pos.lerp(pos, k);
    // Cutscenes follow the action more tightly than play does.
    this.look.lerp(look, jump ? 1 : 1 - Math.exp(-dt * (game.phase === "cutscene" ? 7 : 4)));
    this.shake = Math.max(0, this.shake - dt * 2.2);
    const s = this.shake * this.shake * 0.18;
    const r = this.random;
    camera.position.set(this.pos.x + (r() - 0.5) * s, this.pos.y + (r() - 0.5) * s, this.pos.z + (r() - 0.5) * s);
    camera.lookAt(this.look);
  }

  private target(game: SurvivalGame, dt: number, time: number): { pos: THREE.Vector3; look: THREE.Vector3 } {
    const breathe = new THREE.Vector3(Math.sin(time * 0.6) * 0.03, Math.sin(time * 0.9) * 0.025, 0);
    switch (game.phase) {
      case "lobby":
        return { pos: v(pointAt(3), EYE).add(breathe), look: v(pointAt(22), 1.3 + Math.sin(time * 0.2) * 0.2) };
      case "travel": {
        // One dip per footfall and one sway per stride, in time with the footsteps you hear.
        this.bob += (dt * Math.PI) / STEP_SECONDS;
        const pos = v(pointAt(game.distance), EYE + Math.sin(this.bob * 2) * 0.05);
        const ahead = v(pointAt(game.distance + 8), 1.5);
        const right = new THREE.Vector3().subVectors(ahead, pos).cross(new THREE.Vector3(0, 1, 0)).normalize();
        return { pos: pos.addScaledVector(right, Math.sin(this.bob) * 0.05), look: ahead };
      }
      case "cutscene":
        return game.cutscene === "escape" ? this.escape(game.phaseTime) : this.chopper(game, breathe);
      case "escaped":
        return this.escape(16 + game.phaseTime);
      default: {
        const frame = fightFrame(game.stage);
        const pos = v(frame.origin, EYE).add(breathe);
        const chopper = game.stage === CHOPPER_STAGE ? this.chopper(game, breathe) : null;
        return { pos, look: chopper && game.phase === "clear" ? chopper.look : v(frame.place(14, 0), lookHeight(game)) };
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
    const look = new THREE.Vector3(at.x, frame.origin.y + pose.up + 1, at.z);
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
