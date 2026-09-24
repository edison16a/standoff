import * as THREE from "three";

const VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 top;
  uniform vec3 horizon;
  uniform vec3 sunColor;
  uniform vec3 sunDir;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, 0.0, 1.0);
    vec3 sky = mix(horizon, top, pow(h, 0.55));
    float sun = pow(max(0.0, dot(vDir, sunDir)), 180.0);
    float haze = pow(max(0.0, dot(vDir, sunDir)), 6.0) * 0.35;
    gl_FragColor = vec4(sky + sunColor * (sun * 1.4 + haze), 1.0);
  }
`;

/** A gradient sky with a sun, a dome that rides along with the camera. */
export class Sky {
  readonly mesh: THREE.Mesh;
  private readonly uniforms = {
    top: { value: new THREE.Color() },
    horizon: { value: new THREE.Color() },
    sunColor: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3(0.35, 0.35, -1).normalize() },
  };

  constructor() {
    const material = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT, side: THREE.BackSide, depthWrite: false, fog: false });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), material);
    this.mesh.renderOrder = -1;
    this.mesh.frustumCulled = false;
  }

  set(top: THREE.Color, horizon: THREE.Color, sun: THREE.Color): void {
    this.uniforms.top.value.copy(top);
    this.uniforms.horizon.value.copy(horizon);
    this.uniforms.sunColor.value.copy(sun);
  }

  follow(camera: THREE.Camera): void {
    this.mesh.position.copy(camera.position);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
