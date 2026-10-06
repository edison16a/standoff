import * as THREE from "three";
import { Bloom } from "./bloom";
import { DepthOfField } from "./depth-of-field";
import { FullScreen } from "./fullscreen";
import { gradeMaterial } from "./grade";
import { balance, LIVE_LOOK, type Look } from "./look";

/** Where the depth of field focuses, in metres from the lens, and how deep the sharp band is either side. */
export interface Focus {
  distance: number;
  range: number;
}

const size = new THREE.Vector2();

/**
 * The broadcast finish. The scene draws in linear light into a half
 * float target with multisampling (clean edges on the yard lines, the
 * posts and the players), then gets its bloom, depth of field when the
 * look asks for it, and the grade to the screen through the ACES filmic
 * curve. It follows the renderer's drawing buffer, so the frame budget's
 * resolution changes carry through.
 */
export class Finish {
  /** The look on screen now; the renderer eases it between live play, the replay and the ceremony. */
  readonly look: Look = { ...LIVE_LOOK };
  readonly focus: Focus = { distance: 10, range: 2 };
  private readonly quad = new FullScreen();
  private target: THREE.WebGLRenderTarget;
  private readonly bloom = new Bloom(this.quad);
  private readonly dof = new DepthOfField(this.quad);
  private readonly grade = gradeMaterial();
  private frame = 0;

  constructor(private samples: number) {
    this.target = this.makeTarget(samples);
  }

  private makeTarget(samples: number): THREE.WebGLRenderTarget {
    const depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
    return new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples, depthTexture, stencilBuffer: false });
  }

  /** Changes the multisampling, for the automatic quality. */
  setSamples(samples: number): void {
    if (samples === this.samples) return;
    this.samples = samples;
    this.disposeTarget();
    this.target = this.makeTarget(samples);
  }

  /** Draws `scene` through `camera` to the screen with the finish. */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, exposureScale = 1): void {
    renderer.getDrawingBufferSize(size);
    this.resize(size.x, size.y);
    const look = this.look;
    const dof = look.dof > 0.01;
    // Depth is copied out of the multisampled buffer only when the depth of field reads it.
    this.target.resolveDepthBuffer = dof;
    renderer.setRenderTarget(this.target);
    renderer.render(scene, camera);
    const bloom = look.bloom > 0.001;
    if (bloom) this.bloom.render(renderer, this.target.texture);
    if (dof) this.dof.render(renderer, this.target.texture, this.target.depthTexture!, camera, this.focus.distance, this.focus.range, 0.011);
    const u = this.grade.uniforms;
    u.tScene!.value = this.target.texture;
    u.tBloom!.value = this.bloom.texture;
    u.tDof!.value = this.dof.target.texture;
    u.tDepth!.value = this.target.depthTexture;
    (u.uTexel!.value as THREE.Vector2).set(1 / size.x, 1 / size.y);
    u.uExposure!.value = look.exposure * exposureScale;
    // The levels sum to about five times the light that went in, so it is scaled back.
    u.uBloom!.value = bloom ? look.bloom / Bloom.LEVELS : 0;
    u.uVignette!.value = look.vignette;
    u.uSaturation!.value = look.saturation;
    u.uContrast!.value = look.contrast;
    u.uLift!.value = look.lift;
    u.uDof!.value = dof ? look.dof : 0;
    u.uSharpen!.value = look.sharpen;
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

  private disposeTarget(): void {
    this.target.depthTexture?.dispose();
    this.target.dispose();
  }

  dispose(): void {
    this.disposeTarget();
    this.bloom.dispose();
    this.dof.dispose();
    this.grade.dispose();
    this.quad.dispose();
  }
}
