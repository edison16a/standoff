import * as THREE from "three";
import { Bloom } from "./bloom";
import { DepthOfField } from "./depth-of-field";
import { FullScreen } from "./fullscreen";
import { gradeMaterial } from "./grade";
import { balance, BROADCAST_LOOK, type Look } from "./look";

/** What the finish may spend, set by the frame budget. */
export interface PostOptions {
  /** Multisamples on the scene's target: 4 on a real card, 0 in software. */
  samples: number;
  bloom: boolean;
  dof: boolean;
}

const size = new THREE.Vector2();

/**
 * The picture's finish, as on a match broadcast. The scene is drawn in
 * linear light into a half float target with multisampling (clean edges
 * on the lines, the posts and the players), bloomed, given depth of
 * field when the look asks for it, and graded to the screen through the
 * ACES filmic curve. Name tags are drawn after, straight onto the
 * graded picture, so the grade never dims them.
 */
export class BroadcastPost {
  /** The look on screen now; the renderer eases it between live play, the replay and the ceremony. */
  readonly look: Look = { ...BROADCAST_LOOK };
  /** Where the depth of field focuses, in metres from the camera, and how deep the sharp band is either side. */
  readonly focus = { distance: 6, range: 1.5 };
  /** A standing exposure on top of the look's, for the showcase's film look. */
  gain = 1;
  private readonly quad = new FullScreen();
  private readonly target: THREE.WebGLRenderTarget;
  private readonly bloom = new Bloom(this.quad);
  private readonly dof = new DepthOfField(this.quad);
  private readonly grade = gradeMaterial();
  private frame = 0;

  constructor(readonly options: PostOptions) {
    const depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
    this.target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: options.samples, depthTexture });
  }

  /** Draws `scene` through `camera` to the screen with the finish. */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    renderer.getDrawingBufferSize(size);
    this.resize(size.x, size.y);
    const look = this.look;
    const dof = this.options.dof && look.dof > 0.01;
    const bloom = this.options.bloom && look.bloom > 0.001;
    // Depth is only copied out of the multisampled buffer when the depth of field needs it.
    this.target.resolveDepthBuffer = dof;
    renderer.setRenderTarget(this.target);
    renderer.render(scene, camera);
    if (bloom) this.bloom.render(renderer, this.target.texture);
    if (dof) this.dof.render(renderer, this.target.texture, this.target.depthTexture!, camera, this.focus.distance, this.focus.range, 0.011);
    const u = this.grade.uniforms;
    u.tScene!.value = this.target.texture;
    u.tBloom!.value = this.bloom.texture;
    u.tDof!.value = this.dof.target.texture;
    u.tDepth!.value = this.target.depthTexture;
    u.uExposure!.value = look.exposure * this.gain;
    // The bloom sums five levels, so it is scaled back to one.
    u.uBloom!.value = bloom ? look.bloom / 5 : 0;
    u.uVignette!.value = look.vignette;
    u.uSaturation!.value = look.saturation;
    u.uContrast!.value = look.contrast;
    u.uGrass!.value = look.grass;
    u.uDof!.value = dof ? look.dof : 0;
    u.uAspect!.value = size.x / Math.max(1, size.y);
    u.uSeed!.value = (this.frame++ % 64) * 1.7;
    u.uNear!.value = camera.near;
    u.uFar!.value = camera.far;
    u.uFocus!.value = this.focus.distance;
    u.uRange!.value = this.focus.range;
    (u.uBalance!.value as THREE.Vector3).set(...balance(look.warmth));
    this.quad.draw(renderer, this.grade, null);
  }

  private resize(width: number, height: number): void {
    if (width === this.target.width && height === this.target.height) return;
    this.target.setSize(width, height);
    this.bloom.setSize(width, height);
    this.dof.setSize(width, height);
  }

  dispose(): void {
    this.target.depthTexture?.dispose();
    this.target.dispose();
    this.bloom.dispose();
    this.dof.dispose();
    this.grade.dispose();
    this.quad.dispose();
  }
}
