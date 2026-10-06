import * as THREE from "three";

const size = new THREE.Vector2();
const eye = new THREE.Vector3();
const ahead = new THREE.Vector3();
const up = new THREE.Vector3();
const clear = new THREE.Color();
/** Maps clip space to texture space, for the floor's lookup into the mirror. */
const BIAS = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);

/**
 * The floor's reflection: the scene drawn again from the broadcast
 * camera mirrored under the floor, at a fraction of the picture's size,
 * into a half float target with mipmaps so the floor can blur it as
 * lacquered maple does. The stands, the crowd and the floor itself are
 * left out; what is reflected is what reads in a real broadcast: the
 * players, the ball, the basket, the LED boards and the lamps. Where
 * nothing was drawn, alpha stays 0 and the floor falls back on the
 * environment map.
 */
export class FloorMirror {
  readonly target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
  });
  /** From world space to the mirror's texture, for the floor's shader. */
  readonly matrix = new THREE.Matrix4();
  /** Things never seen in the floor. */
  readonly hidden: THREE.Object3D[] = [];
  private readonly camera = new THREE.PerspectiveCamera();
  private readonly shown: boolean[] = [];
  /** Whether the mirror was drawn this frame; the floor shows none when it was not. */
  active = false;

  constructor(private scale: number) {}

  /** Stops drawing the mirror for good; the floor keeps its environment map gloss. */
  off(): void {
    this.scale = 0;
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, view: THREE.PerspectiveCamera): void {
    this.active = this.scale > 0;
    if (!this.active) return;
    renderer.getDrawingBufferSize(size);
    const w = Math.max(16, Math.round(size.x * this.scale));
    const h = Math.max(16, Math.round(size.y * this.scale));
    if (w !== this.target.width || h !== this.target.height) this.target.setSize(w, h);
    this.place(view);
    const background = scene.background;
    const alpha = renderer.getClearAlpha();
    renderer.getClearColor(clear);
    scene.background = null;
    this.hidden.forEach((o, i) => {
      this.shown[i] = o.visible;
      o.visible = false;
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(scene, this.camera);
    this.hidden.forEach((o, i) => (o.visible = this.shown[i]!));
    scene.background = background;
    renderer.setClearColor(clear, alpha);
    renderer.setRenderTarget(null);
  }

  /** The broadcast camera reflected in the floor (y = 0), its up reflected too, so it stays a true camera. */
  private place(view: THREE.PerspectiveCamera): void {
    view.updateMatrixWorld();
    const cam = this.camera;
    eye.setFromMatrixPosition(view.matrixWorld);
    view.getWorldDirection(ahead);
    up.set(0, 1, 0).transformDirection(view.matrixWorld);
    cam.position.set(eye.x, -eye.y, eye.z);
    cam.up.set(up.x, -up.y, up.z);
    cam.lookAt(eye.x + ahead.x, -(eye.y + ahead.y), eye.z + ahead.z);
    cam.projectionMatrix.copy(view.projectionMatrix);
    cam.projectionMatrixInverse.copy(view.projectionMatrixInverse);
    cam.near = view.near;
    cam.far = view.far;
    cam.updateMatrixWorld();
    this.matrix.copy(BIAS).multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);
  }

  dispose(): void {
    this.target.dispose();
  }
}
