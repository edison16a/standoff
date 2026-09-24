import * as THREE from "three";
import type { Run } from "../engine/run";

/** How wide the view should be across, in degrees, whatever the shape of the screen. */
const ACROSS = 78;

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
  private readonly look = new THREE.Vector3();

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    // Narrow split screen views still see all three tracks: widen the view instead of cropping it.
    const horizontal = THREE.MathUtils.degToRad(ACROSS);
    const vertical = 2 * Math.atan(Math.tan(horizontal / 2) / aspect);
    this.camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(vertical), 52, 82);
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
  }

  update(run: Run, dt: number, time: number): void {
    const s = run.runner;
    this.x += (s.x * 0.85 - this.x) * (1 - Math.exp(-6 * dt));
    // Rises with the runner onto a roof, but only follows a jump a little so the world stays steady.
    const floor = s.grounded ? s.y : Math.min(s.y, Math.max(this.y, s.y * 0.35));
    this.y += (floor - this.y) * (1 - Math.exp(-4 * dt));
    const target = run.crashed ? 1 : 0;
    this.crashView += (target - this.crashView) * (1 - Math.exp(-1.6 * dt));
    this.shake *= Math.exp(-5 * dt);
    const z = -s.distance;
    const c = this.crashView;
    // After a crash the camera swings out to the side and looks back at the runner.
    const back = 6 - 1.5 * c;
    const side = 2.6 * c;
    const height = 3.6 + this.y - 0.8 * c;
    const jitter = this.shake * 0.25;
    this.camera.position.set(this.x + side + Math.sin(time * 61) * jitter, height + Math.sin(time * 47) * jitter, z + back);
    this.look.set(this.x * 0.9 + side * 0.2, 1.2 + this.y * 0.9, z - 9 + 9.5 * c);
    this.camera.lookAt(this.look);
  }
}
