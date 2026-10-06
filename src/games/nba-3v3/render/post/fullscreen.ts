import * as THREE from "three";

/** The vertex shader every full screen pass shares: one triangle that covers the screen, with its UVs. */
export const QUAD_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * Draws a material over a whole render target (or the screen) with one
 * oversized triangle, which is a little cheaper than two because no
 * pixel is shaded twice along a diagonal seam.
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

/** A post pass's material: no depth, no blending unless asked, and never tone mapped by three itself. */
export function passMaterial(fragmentShader: string, uniforms: Record<string, THREE.IUniform>, blending: THREE.Blending = THREE.NoBlending): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({ vertexShader: QUAD_VERTEX, fragmentShader, uniforms, depthTest: false, depthWrite: false, blending, toneMapped: false });
}
