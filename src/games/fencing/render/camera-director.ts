import * as THREE from "three";
import { STRIP_HALF_LENGTH } from "@/games/fencing/engine/rules";

/** The least strip width the bout camera shows, so a close exchange never loses the blades. */
const MIN_SPAN = 4.6;
/** Room around the pair for lunges and blades. */
const MARGIN = 1.7;
/** Height the bout camera must fit: a fencer with the sword raised, and some floor. */
const FIT_HEIGHT = 2.35;
const BOUT_FOV = 30;
const CLOSE_FOV = 24;

/** A camera placed by hand, for the showcase's key art. */
export interface FixedShot {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

type Shot =
  | { kind: "bout" }
  | { kind: "wide" }
  | { kind: "close"; at: THREE.Vector3; side: 1 | -1; since: number; until: number }
  | { kind: "winner"; x: number; facing: 1 | -1; since: number };

/**
 * A broadcast camera for the bout: side on and a little high, following
 * the midpoint between the fencers and pulling back as they part. When a
 * touch lands it cuts in close on the point of contact and slowly swings
 * round it through the slow motion, and at the end it circles the winner.
 * Every move is eased, so it feels operated rather than bolted on.
 */
export class CameraDirector {
  readonly camera = new THREE.PerspectiveCamera(BOUT_FOV, 16 / 9, 0.1, 120);
  private readonly position = new THREE.Vector3(0, 2.6, 11);
  private readonly target = new THREE.Vector3(0, 1, 0);
  private fov = BOUT_FOV;
  private shot: Shot = { kind: "wide" };
  private settled = false;
  /** A fixed camera for key art, which ignores everything else. */
  private fixed: FixedShot | null = null;

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Cuts to a close up of a touch, held until `until` on the wall clock. */
  closeUp(at: THREE.Vector3, side: 1 | -1, wallNow: number, until: number): void {
    this.shot = { kind: "close", at: at.clone(), side, since: wallNow, until };
  }

  /** Holds the close up a little longer, for the burst at the end of the slow motion. */
  holdUntil(until: number): void {
    if (this.shot.kind === "close") this.shot.until = until;
  }

  winner(x: number, facing: 1 | -1, wallNow: number): void {
    this.shot = { kind: "winner", x, facing, since: wallNow };
  }

  /** Back to following the bout, or to the wide shot of the hall when nobody is on the strip. */
  follow(anyone: boolean): void {
    if (this.shot.kind === "close" || this.shot.kind === "winner") return;
    this.shot = anyone ? { kind: "bout" } : { kind: "wide" };
  }

  release(): void {
    this.shot = { kind: "bout" };
  }

  /** Pins the camera, or with null hands it back to the director. */
  pin(shot: FixedShot | null): void {
    this.fixed = shot;
    this.settled = false;
  }

  /** `xs` are the fencers' positions on the strip. */
  update(xs: readonly number[], wallNow: number, dtMs: number): void {
    const shot = this.shot;
    if (shot.kind === "close" && wallNow > shot.until) this.shot = { kind: "bout" };
    const want = this.fixed ?? this.aim(xs, wallNow);
    const rate = this.shot.kind === "close" ? 7 : this.shot.kind === "winner" ? 1.6 : 2.4;
    const k = this.settled ? 1 - Math.exp((-rate * Math.min(dtMs, 100)) / 1000) : 1;
    this.settled = true;
    this.position.lerp(want.position, k);
    this.target.lerp(want.target, k);
    this.fov += (want.fov - this.fov) * k;
    // A touch of hand held drift, as if someone were operating it.
    const t = wallNow / 1000;
    const drift = this.fixed ? 0 : 1;
    this.camera.position.copy(this.position).add(new THREE.Vector3(Math.sin(t * 0.6) * 0.03 * drift, Math.sin(t * 0.83) * 0.02 * drift, 0));
    this.camera.lookAt(this.target);
    if (Math.abs(this.camera.fov - this.fov) > 0.01) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  private aim(xs: readonly number[], wallNow: number): { position: THREE.Vector3; target: THREE.Vector3; fov: number } {
    const shot = this.shot;
    if (shot.kind === "close") {
      // Swing slowly round the contact, from the scorer's side.
      const age = (wallNow - shot.since) / 1000;
      const angle = shot.side * (0.55 - Math.min(1, age / 2.2) * 0.35);
      const at = shot.at;
      const position = new THREE.Vector3(at.x + Math.sin(angle) * 2.3, at.y + 0.12, at.z + Math.cos(angle) * 2.3);
      return { position, target: at.clone().add(new THREE.Vector3(0, -0.05, 0)), fov: CLOSE_FOV };
    }
    if (shot.kind === "winner") {
      const angle = shot.facing * 0.6 + Math.sin((wallNow - shot.since) / 3200) * 0.45;
      const position = new THREE.Vector3(shot.x + Math.sin(angle) * 4.2, 1.7, Math.cos(angle) * 4.2);
      return { position, target: new THREE.Vector3(shot.x, 1.25, 0), fov: 32 };
    }
    if (shot.kind === "wide" || xs.length === 0) {
      const drift = Math.sin(wallNow / 9000) * 2.2;
      return { position: new THREE.Vector3(drift, 3.1, 13.5), target: new THREE.Vector3(drift * 0.6, 1.1, 0), fov: 32 };
    }
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const centre = xs.length === 2 ? (left + right) / 2 : 0;
    const span = Math.max(MIN_SPAN, right - left + MARGIN * 2);
    const vfov = (BOUT_FOV * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
    const distance = Math.max((span / 2) / Math.tan(hfov / 2), FIT_HEIGHT / 2 / Math.tan(vfov / 2));
    const limit = STRIP_HALF_LENGTH - 1;
    const x = Math.max(-limit, Math.min(limit, centre));
    return {
      position: new THREE.Vector3(x, 1.25 + distance * 0.1, distance),
      target: new THREE.Vector3(x, 1.02, 0),
      fov: BOUT_FOV,
    };
  }
}
