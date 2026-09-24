import * as THREE from "three";
import type { ScreenPoint } from "@/games/kit/aim/aim-math";
import { CAMERA } from "../engine/layout";
import type { Ray } from "../engine/raycast";

/** The widest shape the booth was framed for. Narrower screens widen the view instead of cropping. */
const DESIGN_ASPECT = 1.6;

/**
 * The one camera the booth is seen through. The host keeps it even before
 * anything is drawn, because every shot is a ray from this camera through
 * the player's aim point, and the picture must use exactly the same one.
 */
export class GalleryCamera {
  readonly camera = new THREE.PerspectiveCamera(CAMERA.fov, DESIGN_ASPECT, 0.05, 60);
  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();

  constructor() {
    const { position, lookAt } = CAMERA;
    this.camera.position.set(position.x, position.y, position.z);
    this.camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
    this.resize(DESIGN_ASPECT);
  }

  resize(aspect: number): void {
    const camera = this.camera;
    camera.aspect = aspect;
    // Keep the booth's width in view on a squarer screen by opening the vertical angle.
    const half = THREE.MathUtils.degToRad(CAMERA.fov / 2);
    camera.fov = aspect >= DESIGN_ASPECT ? CAMERA.fov : THREE.MathUtils.radToDeg(2 * Math.atan((Math.tan(half) * DESIGN_ASPECT) / aspect));
    camera.updateProjectionMatrix();
  }

  /** A ray from the camera through a point on screen, in the aim kit's clip space. */
  ray(point: ScreenPoint): Ray {
    this.ndc.set(point.x, point.y);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const { origin, direction } = this.raycaster.ray;
    return { origin: { x: origin.x, y: origin.y, z: origin.z }, dir: { x: direction.x, y: direction.y, z: direction.z } };
  }
}
