import * as THREE from "three";
import { Bake, tube } from "./bake";

/** The two rings of lamp banks over the court: the same ones the environment map shows, so the reflections line up. */
export const LAMP_RINGS = [
  { count: 10, radius: 7, y: 19, turn: 0 },
  { count: 16, radius: 13, y: 21, turn: 0.2 },
] as const;
const CENTRE = new THREE.Vector3(0, 0, 5);

const BEAM_VERTEX = /* glsl */ `
  varying float vAlong;
  varying float vEdge;
  void main() {
    vAlong = uv.y;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec3 n = normalize(mat3(modelMatrix) * normal);
    vEdge = abs(dot(n, normalize(cameraPosition - world.xyz)));
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const BEAM_FRAGMENT = /* glsl */ `
  uniform float uStrength;
  varying float vAlong;
  varying float vEdge;
  void main() {
    // Bright at the lamp, gone before the floor, and soft at the beam's sides.
    float a = pow(vAlong, 2.2) * vEdge * vEdge * uStrength;
    gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * a, 1.0);
  }
`;

/**
 * The roof: a steel truss ring hung over the court, carrying the lamp
 * banks that light it. Each lamp is a dark housing with a face far
 * brighter than white, so the finish blooms it the way a camera sees
 * arena lights, and a faint beam of haze below it. The truss is one
 * draw, the housings one, the faces one and the beams one.
 */
export class Roof {
  readonly group = new THREE.Group();
  private readonly owned: THREE.Material[] = [];
  private readonly beamUniforms = { uStrength: { value: 0.05 } };
  private beamMesh: THREE.Mesh | null = null;

  constructor(beams: boolean) {
    const steel = new THREE.MeshStandardMaterial({ color: "#1a1d26", roughness: 0.6, metalness: 0.6 });
    const housing = new THREE.MeshStandardMaterial({ color: "#11131a", roughness: 0.45, metalness: 0.5 });
    const face = new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff3e2").multiplyScalar(14) });
    this.owned.push(steel, housing, face);
    const truss = new Bake();
    const lamps = new Bake();
    const faces = new Bake();
    for (const ring of LAMP_RINGS) {
      const y = ring.y + 0.6;
      // Two chords of the truss ring, with zigzag webbing between them.
      const pts = 48;
      for (let i = 0; i < pts; i++) {
        const a0 = (i / pts) * Math.PI * 2;
        const a1 = ((i + 1) / pts) * Math.PI * 2;
        const at = (a: number, r: number, h: number) => new THREE.Vector3(CENTRE.x + Math.sin(a) * r, h, CENTRE.z + Math.cos(a) * r);
        truss.add(tube(at(a0, ring.radius, y), at(a1, ring.radius, y), 0.06, 6), steel);
        truss.add(tube(at(a0, ring.radius, y + 0.7), at(a1, ring.radius, y + 0.7), 0.06, 6), steel);
        truss.add(tube(at(a0, ring.radius, y), at(a1, ring.radius, y + 0.7), 0.03, 4), steel);
      }
      for (let i = 0; i < ring.count; i++) {
        const a = (i / ring.count) * Math.PI * 2 + ring.turn;
        const x = CENTRE.x + Math.sin(a) * ring.radius;
        const z = CENTRE.z + Math.cos(a) * ring.radius;
        // Aim each bank at the court below: tilt it in toward the middle.
        const tilt = Math.atan2(ring.radius * 0.6, ring.y);
        // The tilt is applied to the piece itself, so it turns about the bank's own axis before the bank is turned to face in.
        const place = { x, y: ring.y, z, ry: a };
        lamps.add(new THREE.BoxGeometry(1.9, 0.35, 0.8).rotateX(tilt), housing, place);
        faces.add(new THREE.PlaneGeometry(1.7, 0.6).rotateX(Math.PI / 2).translate(0, -0.18, 0).rotateX(tilt), face, place);
        truss.add(tube(new THREE.Vector3(x, ring.y + 0.15, z), new THREE.Vector3(x, y, z), 0.03, 4), steel);
      }
    }
    for (const m of [...truss.build(false), ...lamps.build(false), ...faces.build(false)]) this.group.add(m);
    if (beams) this.beams();
  }

  /** Faint cones of light through the haze under the inner ring, the look of a lit arena on television. */
  private beams(): void {
    const mat = new THREE.ShaderMaterial({ vertexShader: BEAM_VERTEX, fragmentShader: BEAM_FRAGMENT, uniforms: this.beamUniforms, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.owned.push(mat);
    const bake = new Bake();
    const ring = LAMP_RINGS[0];
    for (let i = 0; i < ring.count; i++) {
      const a = (i / ring.count) * Math.PI * 2 + ring.turn;
      const top = new THREE.Vector3(CENTRE.x + Math.sin(a) * ring.radius, ring.y - 0.2, CENTRE.z + Math.cos(a) * ring.radius);
      const foot = new THREE.Vector3(CENTRE.x + Math.sin(a) * ring.radius * 0.35, 0, CENTRE.z + Math.cos(a) * ring.radius * 0.35);
      const len = top.distanceTo(foot);
      // A cone with its narrow end at the lamp; uv.y runs 1 at the lamp to 0 at the floor.
      const cone = new THREE.CylinderGeometry(0.5, 2.6, len, 16, 1, true);
      cone.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(foot).normalize()));
      cone.translate((top.x + foot.x) / 2, (top.y + foot.y) / 2, (top.z + foot.z) / 2);
      bake.add(cone, mat);
    }
    const [mesh] = bake.build(false);
    if (mesh) {
      mesh.renderOrder = 3;
      this.beamMesh = mesh;
      this.group.add(mesh);
    }
  }

  /** Puts out the haze beams, for a card that cannot keep up. */
  dropBeams(): void {
    if (this.beamMesh) this.beamMesh.visible = false;
  }

  dispose(): void {
    for (const m of this.owned) m.dispose();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
  }
}
