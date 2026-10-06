import * as THREE from "three";
import { Bloom } from "./bloom";
import { DepthOfField } from "./depth-of-field";
import { FullScreen } from "./fullscreen";
import { gradeMaterial } from "./grade";
import { balance, BROADCAST_LOOK, type Look } from "./look";

/** Where the depth of field focuses, in metres from the camera, and how deep the sharp band is either side. */
export interface Focus {
  distance: number;
  range: number;
}

const size = new THREE.Vector2();

/**
 * The picture's finish, as on a sports broadcast. The scene is drawn in
 * linear light into a half float target with 4x multisampling (clean
 * edges on the lines, the rim and the players), then bloomed, given
 * depth of field when the look asks for it, and graded to the screen
 * through the ACES filmic curve. Everything follows the renderer's
 * drawing buffer, so the frame budget's resolution changes carry through.
 */
export class BroadcastPost {
  /** The look on screen now; the renderer eases it between live play, the replay and the ceremony. */
  readonly look: Look = { ...BROADCAST_LOOK };
  readonly focus: Focus = { distance: 6, range: 1.5 };
  private readonly quad = new FullScreen();
  private readonly target: THREE.WebGLRenderTarget;
  private readonly bloom = new Bloom(this.quad);
  private readonly dof = new DepthOfField(this.quad);
  private readonly grade = gradeMaterial();
  private frame = 0;

  constructor(samples: number) {
    const depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
    this.target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples, depthTexture });
  }

  /** Draws `scene` through `camera` to the screen with the finish. */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    renderer.getDrawingBufferSize(size);
    this.resize(size.x, size.y);
    const look = this.look;
    const dof = look.dof > 0.01;
    // Depth is only copied out of the multisampled buffer when the depth of field needs it.
    this.target.resolveDepthBuffer = dof;
    renderer.setRenderTarget(this.target);
    renderer.render(scene, camera);
    if (look.bloom > 0.001) this.bloom.render(renderer, this.target.texture);
    if (dof) this.dof.render(renderer, this.target.texture, this.target.depthTexture!, camera, this.focus.distance, this.focus.range, 0.012);
    const u = this.grade.uniforms;
    u.tScene!.value = this.target.texture;
    u.tBloom!.value = this.bloom.texture;
    u.tDof!.value = this.dof.target.texture;
    u.tDepth!.value = this.target.depthTexture;
    u.uExposure!.value = look.exposure;
    // The bloom sums five levels, so it is scaled back to one.
    u.uBloom!.value = look.bloom > 0.001 ? look.bloom / 5 : 0;
    u.uVignette!.value = look.vignette;
    u.uSaturation!.value = look.saturation;
    u.uContrast!.value = look.contrast;
    u.uLift!.value = look.lift;
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
