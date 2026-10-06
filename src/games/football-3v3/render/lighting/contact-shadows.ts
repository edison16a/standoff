import * as THREE from "three";
import type { MatchView } from "../../engine/view";
import type { Squad } from "../figures/squad";

/** Three blobs a player (the body and both feet), and one for the ball. */
const PER_PLAYER = 3;
const MAX = 16 * PER_PLAYER + 1;

const VERTEX = /* glsl */ `
  attribute float aStrength;
  varying vec2 vUv;
  varying float vStrength;
  #include <common>
  #include <fog_pars_vertex>
  void main() {
    vUv = uv * 2.0 - 1.0;
    vStrength = aStrength;
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

/** Darkest in the middle, fading on a smooth curve to nothing at the rim, so it reads as occlusion and not as a disc. */
const FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  varying float vStrength;
  void main() {
    float d = dot(vUv, vUv);
    float a = vStrength * pow(max(0.0, 1.0 - d), 2.2);
    gl_FragColor = vec4(0.0, 0.0, 0.0, a);
  }
`;

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const foot = new THREE.Vector3();
const toe = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);

/**
 * Contact shadows: the soft dark where a body meets the turf, which the
 * floodlights' shadows are too soft and too far apart to give. A broad
 * pool under each player that tightens as he crouches, a small dark spot
 * under each cleat that is darkest planted and fades as the foot lifts,
 * and one under the ball that spreads and fades as it climbs. All of it
 * one instanced draw.
 */
export class ContactShadows {
  readonly mesh: THREE.InstancedMesh;
  private readonly strength: THREE.InstancedBufferAttribute;

  constructor() {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    this.strength = new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1);
    geo.setAttribute("aStrength", this.strength);
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      transparent: true,
      depthWrite: false,
      fog: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.mesh = new THREE.InstancedMesh(geo, material, MAX);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
  }

  update(view: MatchView, squad: Squad): void {
    let n = 0;
    const put = (x: number, z: number, yaw: number, w: number, l: number, a: number) => {
      if (n >= MAX || a <= 0.005) return;
      q.setFromAxisAngle(Y, yaw);
      m.compose(p.set(x, 0.008, z), q, s.set(w, 1, l));
      this.mesh.setMatrixAt(n, m);
      this.strength.setX(n, a);
      n++;
    };
    for (const a of view.athletes) {
      const figure = squad.figure(a.id);
      if (!figure) continue;
      const rig = figure.rig;
      rig.hips.getWorldPosition(p);
      const hipY = p.y;
      // A crouched or fallen body sits closer, so its pool is darker and tighter.
      const low = THREE.MathUtils.clamp(1 - (hipY - 0.35) / 0.75, 0, 1);
      put(p.x, p.z, a.yaw, 1.15 - 0.2 * low, 1.25 - 0.1 * low, 0.32 + 0.28 * low);
      for (const ankle of [rig.ankleL, rig.ankleR]) {
        ankle.getWorldPosition(foot);
        toe.set(0, 0, 0.12).applyQuaternion(ankle.getWorldQuaternion(q));
        const lift = Math.max(0, foot.y - rig.dims.ankleY);
        put(foot.x + toe.x, foot.z + toe.z, Math.atan2(toe.x, toe.z), 0.24, 0.42, 0.6 * Math.max(0, 1 - lift / 0.22));
      }
    }
    const b = squad.ball;
    if (b.free) {
      const y = Math.max(0, b.at.y - 0.1);
      const spread = 0.4 + y * 0.12;
      put(b.at.x, b.at.z, 0, spread, spread, 0.55 * Math.max(0, 1 - y / 4));
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.strength.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
