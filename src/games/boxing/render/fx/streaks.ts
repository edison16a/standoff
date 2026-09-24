import * as THREE from "three";

interface Spark {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  life: number;
  colour: THREE.Color;
  width: number;
}

const MAX = 400;
/** A streak is as long as the distance its spark covers in this many seconds. */
const TRAIL_S = 0.05;
const GRAVITY = 7;
const DRAG = 0.1;

/**
 * Hot sparks drawn as glowing streaks stretched along their flight, the
 * way a camera sees them: one instanced quad each, turned to face the
 * camera in the vertex shader, and added onto the picture so they glow.
 */
export class Streaks {
  readonly mesh: THREE.Mesh;
  private readonly sparks: Spark[] = [];
  private readonly head: Float32Array;
  private readonly tail: Float32Array;
  private readonly colour: Float32Array;
  private readonly width: Float32Array;
  private readonly geometry: THREE.InstancedBufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private next = 0;

  constructor() {
    const quad = new THREE.PlaneGeometry(1, 1);
    this.geometry = new THREE.InstancedBufferGeometry();
    this.geometry.index = quad.index;
    this.geometry.setAttribute("position", quad.getAttribute("position"));
    this.head = new Float32Array(MAX * 3);
    this.tail = new Float32Array(MAX * 3);
    this.colour = new Float32Array(MAX * 3);
    this.width = new Float32Array(MAX);
    const attr = (array: Float32Array, size: number) => new THREE.InstancedBufferAttribute(array, size).setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute("aHead", attr(this.head, 3));
    this.geometry.setAttribute("aTail", attr(this.tail, 3));
    this.geometry.setAttribute("aColour", attr(this.colour, 3));
    this.geometry.setAttribute("aWidth", attr(this.width, 1));
    this.geometry.instanceCount = MAX;
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { viewport: { value: new THREE.Vector2(1, 1) } },
      vertexShader: /* glsl */ `
        attribute vec3 aHead;
        attribute vec3 aTail;
        attribute vec3 aColour;
        attribute float aWidth;
        uniform vec2 viewport;
        varying vec3 vColour;
        varying vec2 vUv;
        void main() {
          vec4 h = projectionMatrix * viewMatrix * vec4(aHead, 1.0);
          vec4 t = projectionMatrix * viewMatrix * vec4(aTail, 1.0);
          vec2 hs = h.xy / h.w * viewport;
          vec2 ts = t.xy / t.w * viewport;
          vec2 dir = hs - ts;
          dir = length(dir) < 0.001 ? vec2(1.0, 0.0) : normalize(dir);
          vec2 side = vec2(-dir.y, dir.x);
          float along = position.y + 0.5;
          vec4 base = mix(t, h, along);
          // Width in pixels, a little wider at the head, which is the hot end.
          float w = aWidth * (0.5 + along) / base.w;
          base.xy += side * position.x * w * 2.0 / viewport * base.w;
          gl_Position = base;
          vColour = aColour;
          vUv = vec2(position.x * 2.0, along);
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColour;
        varying vec2 vUv;
        void main() {
          float edge = 1.0 - abs(vUv.x);
          gl_FragColor = vec4(vColour * edge * edge * (0.3 + 0.7 * vUv.y), 1.0);
        }`,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < MAX; i++) {
      this.sparks.push({ position: new THREE.Vector3(), velocity: new THREE.Vector3(), age: 1, life: 0, colour: new THREE.Color(), width: 0 });
    }
  }

  /** The view's size in pixels, so streak widths stay in pixels. */
  setViewport(width: number, height: number): void {
    this.material.uniforms.viewport!.value.set(width / 2, height / 2);
  }

  spawn(at: THREE.Vector3, velocity: THREE.Vector3, life: number, colour: THREE.ColorRepresentation, width: number): void {
    const s = this.sparks[this.next]!;
    this.next = (this.next + 1) % MAX;
    s.position.copy(at);
    s.velocity.copy(velocity);
    s.age = 0;
    s.life = life;
    s.colour.set(colour);
    s.width = width;
  }

  update(dt: number): void {
    const drag = Math.pow(DRAG, dt);
    for (let i = 0; i < MAX; i++) {
      const s = this.sparks[i]!;
      const alive = s.age < s.life;
      if (alive) {
        s.age += dt;
        s.velocity.multiplyScalar(drag);
        s.velocity.y -= GRAVITY * dt;
        s.position.addScaledVector(s.velocity, dt);
      }
      const fade = alive ? Math.max(0, 1 - s.age / s.life) : 0;
      this.head.set([s.position.x, s.position.y, s.position.z], i * 3);
      this.tail.set([s.position.x - s.velocity.x * TRAIL_S, s.position.y - s.velocity.y * TRAIL_S, s.position.z - s.velocity.z * TRAIL_S], i * 3);
      this.colour.set([s.colour.r * fade * 2, s.colour.g * fade * 2, s.colour.b * fade * 2], i * 3);
      this.width[i] = alive ? s.width : 0;
    }
    for (const name of ["aHead", "aTail", "aColour", "aWidth"]) this.geometry.getAttribute(name).needsUpdate = true;
  }

  clear(): void {
    for (const s of this.sparks) s.age = s.life = 1;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
