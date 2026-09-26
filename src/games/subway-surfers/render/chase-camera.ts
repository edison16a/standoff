import * as THREE from "three";
import type { Run } from "../engine/run";
import { SPEED } from "../engine/tuning";

/** How wide the view should be across, in degrees, whatever the shape of the screen. */
const ACROSS = 78;
/** How far the lens keeps under a tunnel roof. */
const CLEARANCE = 0.45;
/** No roof: the cap sits this high, out of the way. */
const OPEN_SKY = 100;

/**
 * The camera behind one runner, low and close like the real game. It
 * follows the runner across lanes a little lazily, rises with them onto
 * the roofs, shakes on a crash and swings round to the front after it.
 */
export class ChaseCamera {
  readonly camera = new THREE.PerspectiveCamera(62, 1, 0.1, 400);
  private x = 0;
  private y = 0;
  private shake = 0;
  private crashView = 0;
  /** Degrees added to the view at speed. */
  private boost = 0;
  private readonly look = new THREE.Vector3();
  /** The highest the lens may go, eased so it dips smoothly into a tunnel. */
  private cap = OPEN_SKY;
  /** The lowest thing overhead at a distance along the track and an x. The scene sets it. */
  ceiling: (distance: number, x: number) => number = () => Infinity;

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    // Narrow split screen views still see all three tracks: widen the view instead of cropping it.
    const horizontal = THREE.MathUtils.degToRad(ACROSS);
    const vertical = 2 * Math.atan(Math.tan(horizontal / 2) / aspect);
    // The view widens a little with speed, which makes a fast run feel faster.
    this.camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(vertical), 52, 82) + this.boost;
    this.camera.updateProjectionMatrix();
  }

  bump(amount: number): void {
    this.shake = Math.max(this.shake, amount);
  }

  reset(run: Run): void {
    this.x = run.runner.x;
    this.y = run.runner.y;
    this.crashView = 0;
    this.shake = 0;
    this.cap = OPEN_SKY;
  }

  update(run: Run, dt: number, time: number): void {
    const s = run.runner;
    this.x += (s.x * 0.85 - this.x) * (1 - Math.exp(-6 * dt));
    // Rises with the runner onto a roof, but only follows a jump a little so the world stays steady.
    // A jetpack flight is followed all the way up.
    const flying = run.powers.has("jetpack") && !run.crashed;
    const floor = flying ? s.y - 1.2 : s.grounded ? s.y : Math.min(s.y, Math.max(this.y, s.y * 0.35));
    this.y += (floor - this.y) * (1 - Math.exp(-(flying ? 2 : 4) * dt));
    const fast = run.crashed ? 0 : Math.max(0, Math.min(1, (run.speed - SPEED.start) / (SPEED.max - SPEED.start)));
    this.boost += (fast * 9 + (flying ? 4 : 0) - this.boost) * (1 - Math.exp(-2 * dt));
    const target = run.crashed ? 1 : 0;
    this.crashView += (target - this.crashView) * (1 - Math.exp(-1.6 * dt));
    this.shake *= Math.exp(-5 * dt);
    const z = -s.distance;
    const c = this.crashView;
    // After a crash the camera swings a little toward the middle and rises to look down at the runner.
    // Staying above the roofs means it never ends up inside a train on the next track.
    const back = 5.3 - 1.4 * c;
    const side = 1.3 * c * (s.x > 0.1 ? -1 : 1);
    // Under a tunnel roof the lens stays inside, looking ahead as far as the runner, so a jetpack
    // flight never lifts it through the vault into the dark above.
    const x = this.x + side;
    const roof = Math.min(this.ceiling(s.distance - back, x), this.ceiling(s.distance - back / 2, x), this.ceiling(s.distance, x));
    this.cap += (Math.min(OPEN_SKY, roof - CLEARANCE) - this.cap) * (1 - Math.exp(-10 * dt));
    const height = Math.min(3.4 + this.y + 1.1 * c, this.cap);
    const jitter = this.shake * 0.25;
    this.camera.position.set(x + Math.sin(time * 61) * jitter, height + Math.sin(time * 47) * jitter, z + back);
    this.look.set(this.x * 0.9 + side * 0.2, 1.1 + this.y * 0.9, z - 8 + 7 * c);
    this.camera.lookAt(this.look);
  }
}
