import * as THREE from "three";

/** The vertex shader every full screen pass shares: one triangle over the screen, with its UVs. */
const QUAD_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * Draws a material over a whole render target, or the screen, with one
 * oversized triangle: no pixel is shaded twice along a diagonal seam.
 */
export class FullScreen {
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly mesh: THREE.Mesh;

  constructor() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.mesh = new THREE.Mesh(geometry);
    this.mesh.frustumCulled = false;
  }

  draw(renderer: THREE.WebGLRenderer, material: THREE.Material, target: THREE.WebGLRenderTarget | null): void {
    this.mesh.material = material;
    renderer.setRenderTarget(target);
    renderer.render(this.mesh, this.camera);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
  }
}

/** A post pass's material: no depth test, no blending, and never tone mapped by three itself. */
export function passMaterial(fragmentShader: string, uniforms: Record<string, THREE.IUniform>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({ vertexShader: QUAD_VERTEX, fragmentShader, uniforms, depthTest: false, depthWrite: false, blending: THREE.NoBlending, toneMapped: false });
}

/** A half float colour target with no depth, for the passes' steps. */
export function colourTarget(): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
}
