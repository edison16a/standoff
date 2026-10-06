import * as THREE from "three";

export interface StreakSpec {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  color: THREE.ColorRepresentation;
  /** Width in metres. */
  width?: number;
  /** The height they bounce off, usually the road under the kart. */
  floor?: number;
}

const color = new THREE.Color();

/**
 * Sparks drawn as glowing streaks stretched along their own motion, the
 * way hot metal sparks look on camera: they fly out, fall, skip off the
 * road and fade from white hot to the spark colour. One instanced draw
 * for every spark on the map; each is a quad turned to face the camera
 * and stretched between where it is and where it was a moment ago.
 */
export class Streaks {
  readonly mesh: THREE.Mesh;
  private readonly max: number;
  private readonly head: Float32Array;
  private readonly vel: Float32Array;
  private readonly tint: Float32Array;
  private readonly fade: Float32Array;
  private readonly state: { life: number; age: number; floor: number; width: number }[] = [];
  private next = 0;
  private readonly attrs: THREE.InstancedBufferAttribute[];

  constructor(max: number) {
    this.max = max;
    this.head = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.tint = new Float32Array(max * 3);
    this.fade = new Float32Array(max * 2);
    for (let i = 0; i < max; i++) this.state.push({ life: 0, age: 1, floor: -Infinity, width: 0.05 });
    const geo = new THREE.InstancedBufferGeometry();
    // x 0 is the spark's head, 1 its tail; y is across.
    geo.setAttribute("position", new THREE.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 0, 1, 0, 1, 1, 0], 3));
    geo.setIndex([0, 1, 2, 2, 1, 3]);
    const attr = (array: Float32Array, size: number) => new THREE.InstancedBufferAttribute(array, size).setUsage(THREE.DynamicDrawUsage);
    this.attrs = [attr(this.head, 3), attr(this.vel, 3), attr(this.tint, 3), attr(this.fade, 2)];
    geo.setAttribute("head", this.attrs[0]!);
    geo.setAttribute("vel", this.attrs[1]!);
    geo.setAttribute("tint", this.attrs[2]!);
    geo.setAttribute("fade", this.attrs[3]!);
    geo.instanceCount = max;
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute vec3 head;
        attribute vec3 vel;
        attribute vec3 tint;
        attribute vec2 fade;
        varying vec3 vColor;
        varying float vAcross;
        varying float vAlong;
        void main() {
          vec4 h = projectionMatrix * modelViewMatrix * vec4(head, 1.0);
          vec4 t = projectionMatrix * modelViewMatrix * vec4(head - vel * 0.022, 1.0);
          float aspect = projectionMatrix[1][1] / projectionMatrix[0][0];
          vec2 d = t.xy / t.w - h.xy / h.w;
          d.x *= aspect;
          vec2 n = normalize(vec2(-d.y, d.x) + 1e-5);
          n.x /= aspect;
          vec4 p = mix(h, t, position.x);
          p.xy += n * position.y * fade.y * projectionMatrix[1][1];
          gl_Position = fade.x > 0.0 ? p : vec4(2.0, 2.0, 2.0, 1.0);
          // Fade sparks right at the lens, which would smear across the whole view.
          float near = smoothstep(0.8, 2.5, h.w);
          // White hot when fresh, cooling to the spark's colour.
          vColor = mix(tint, vec3(1.0), fade.x * fade.x * 0.6) * fade.x * near;
          vAcross = position.y;
          vAlong = position.x;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAcross;
        varying float vAlong;
        void main() {
          float a = (1.0 - abs(vAcross)) * (1.0 - vAlong * 0.85);
          gl_FragColor = vec4(vColor * a * 2.2, a);
          #include <colorspace_fragment>
        }`,
    });
    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.frustumCulled = false;
  }

  emit(s: StreakSpec): void {
    const i = this.next;
    this.next = (this.next + 1) % this.max;
    const st = this.state[i]!;
    st.life = s.life;
    st.age = 0;
    st.floor = s.floor ?? -Infinity;
    st.width = s.width ?? 0.035;
    this.head.set([s.x, s.y, s.z], i * 3);
    this.vel.set([s.vx, s.vy, s.vz], i * 3);
    color.set(s.color);
    this.tint.set([color.r, color.g, color.b], i * 3);
  }

  update(dt: number): void {
    for (let i = 0; i < this.max; i++) {
      const s = this.state[i]!;
      if (s.age >= s.life) {
        this.fade[i * 2] = 0;
        continue;
      }
      s.age += dt;
      const k = i * 3;
      this.vel[k + 1] = this.vel[k + 1]! - 16 * dt;
      for (let a = 0; a < 3; a++) this.head[k + a] = this.head[k + a]! + this.vel[k + a]! * dt;
      // Skip off the road, losing most of the bounce.
      if (this.head[k + 1]! < s.floor && this.vel[k + 1]! < 0) {
        this.head[k + 1] = s.floor;
        this.vel[k + 1] = -this.vel[k + 1]! * 0.35;
        this.vel[k] = this.vel[k]! * 0.7;
        this.vel[k + 2] = this.vel[k + 2]! * 0.7;
      }
      this.fade[i * 2] = Math.max(0, 1 - s.age / s.life);
      this.fade[i * 2 + 1] = s.width;
    }
    for (const attr of this.attrs) attr.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
