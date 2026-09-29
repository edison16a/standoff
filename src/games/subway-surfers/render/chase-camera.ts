import * as THREE from "three";
import type { Run } from "../engine/run";
import { LANE_WIDTH, SPEED } from "../engine/tuning";
import { CameraFeel } from "./camera-feel";

/** How wide the view should be across, in degrees, whatever the shape of the screen. */
const ACROSS = 74;
/** How far the lens keeps under a tunnel roof. */
const CLEARANCE = 0.45;
/** No roof: the cap sits this high, out of the way. */
const OPEN_SKY = 100;

/**
 * Where the lens sits from the runner's feet, like the real game: well
 * behind and above, looking down the tracks so the runner stands in the
 * lower middle of the picture with the yard opening out ahead.
 */
export const RIG = { back: 6, up: 3.8, lookAhead: 5.5, lookUp: 0.5 };

/**
 * The camera behind one runner. It follows them across lanes a touch
 * behind and leans into the move, rises with them onto the roofs, shakes
 * on a knock, widens with speed, and swings round to the front after a crash.
 */
export class ChaseCamera {
  readonly camera = new THREE.PerspectiveCamera(62, 1, 0.1, 400);
  readonly feel = new CameraFeel();
  private x = 0;
  private vx = 0;
  private y = 0;
  private tilt = 0;
  private crashView = 0;
  private readonly look = new THREE.Vector3();
  /** The highest the lens may go, eased so it dips smoothly into a tunnel. */
  private cap = OPEN_SKY;
  /** The lowest thing overhead at a distance along the track and an x. The scene sets it. */
  ceiling: (distance: number, x: number) => number = () => Infinity;

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    // A narrow window still sees all three tracks: widen the view instead of cropping it.
    const horizontal = THREE.MathUtils.degToRad(ACROSS);
    const vertical = 2 * Math.atan(Math.tan(horizontal / 2) / aspect);
    this.camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(vertical), 50, 80) + this.feel.widen;
    this.camera.updateProjectionMatrix();
  }

  bump(amount: number): void {
    this.feel.bump(amount);
  }

  kick(degrees: number): void {
    this.feel.kick(degrees);
  }

  reset(run: Run): void {
    this.x = run.runner.x;
    this.vx = 0;
    this.y = run.runner.y;
    this.tilt = 0;
    this.crashView = 0;
    this.cap = OPEN_SKY;
    this.feel.reset();
  }

  update(run: Run, dt: number, time: number): void {
    const s = run.runner;
    // Follows across lanes a beat behind the runner, so a lane change reads as the runner moving.
    const x = this.x;
    this.x += (s.x * 0.8 - this.x) * (1 - Math.exp(-9 * dt));
    this.vx = dt > 0 ? (this.x - x) / dt : 0;
    // Rises with the runner onto a roof, but only follows a jump a little so the world stays steady.
    // A jetpack flight is followed all the way up.
    const flying = run.powers.has("jetpack") && !run.crashed;
    const floor = flying ? s.y - 0.6 : s.grounded ? s.y : Math.min(s.y, Math.max(this.y, s.y * 0.25));
    this.y += (floor - this.y) * (1 - Math.exp(-(flying ? 2 : 4.5) * dt));
    const fast = run.crashed ? 0 : THREE.MathUtils.clamp((run.speed - SPEED.start) / (SPEED.max - SPEED.start), 0, 1);
    this.feel.update(dt, time, fast, flying ? 5 : 0);
    // A slight roll into a lane change, the way a camera on a rig swings.
    this.tilt += (THREE.MathUtils.clamp(-this.vx / (LANE_WIDTH * 8), -1, 1) * 0.03 - this.tilt) * (1 - Math.exp(-10 * dt));
    this.crashView += ((run.crashed ? 1 : 0) - this.crashView) * (1 - Math.exp(-1.6 * dt));
    this.place(run, this.crashView, dt);
  }

  private place(run: Run, c: number, dt: number): void {
    const s = run.runner;
    const z = -s.distance;
    // After a crash the camera swings a little toward the middle and rises to look down at the runner.
    // Staying above the roofs means it never ends up inside a train on the next track.
    const back = RIG.back - 1.8 * c;
    const side = 1.3 * c * (s.x > 0.1 ? -1 : 1);
    // Under a tunnel roof the lens stays inside, looking a little way past the runner, so a jetpack
    // flight dips in time at the mouth and never lifts it through the vault into the dark above.
    const x = this.x + side;
    const roof = Math.min(this.ceiling(s.distance - back, x), this.ceiling(s.distance - back / 2, x), this.ceiling(s.distance, x), this.ceiling(s.distance + back, x));
    const natural = RIG.up + this.y + 0.6 * c;
    // Ease down from where the lens is, not from open sky, so it is under the ribs by the tunnel mouth.
    this.cap = Math.min(this.cap, natural);
    this.cap += (Math.min(OPEN_SKY, roof - CLEARANCE) - this.cap) * (1 - Math.exp(-10 * dt));
    const height = Math.min(natural, this.cap);
    const { offset } = this.feel;
    this.camera.position.set(x + offset.x, height + offset.y, z + back);
    this.look.set(this.x * 0.9 + side * 0.2, RIG.lookUp + this.y * 0.95 + 0.6 * c, z - RIG.lookAhead + (RIG.lookAhead - 1) * c);
    this.camera.lookAt(this.look);
    this.camera.rotateZ(this.tilt + offset.roll);
  }
}
