import * as THREE from "three";
import type { Body } from "../body/athlete-body";

/** Over this many pixels tall on screen a body is drawn in its fine cut; it drops back under the lower mark, so it never flickers between them. */
const UP = 300;
const DOWN = 240;

const at = new THREE.Vector3();
const eye = new THREE.Vector3();

/**
 * Picks how finely a body is drawn from how big it is on screen: the
 * fine cut for close ups and replays, the lighter one for the wide view.
 */
export class LodSwitch {
  private fine = false;

  constructor(private readonly body: Body) {}

  /** `pixels` is the screen's height in drawing pixels. */
  fit(camera: THREE.PerspectiveCamera, pixels: number): void {
    this.body.root.getWorldPosition(at);
    at.y += this.body.height * 0.5;
    camera.getWorldPosition(eye);
    const scale = pixels / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) * camera.zoom;
    const tall = (this.body.height / Math.max(0.1, at.distanceTo(eye))) * scale;
    const want = this.fine ? tall > DOWN : tall > UP;
    if (want === this.fine) return;
    this.fine = want;
    this.body.setFine(want);
  }

  /** Always fine, for a preview that only ever shows one body close up. */
  force(fine: boolean): void {
    this.fine = fine;
    this.body.setFine(fine);
  }
}
