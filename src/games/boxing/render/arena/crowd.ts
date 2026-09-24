import * as THREE from "three";
import { seeded } from "../../engine/random";
import { PLATFORM } from "./ring";

/** Rows of seats rising away from the ring on all four sides. */
const ROWS = 9;
const FIRST_ROW = 5.4;
const ROW_DEPTH = 0.95;
const ROW_RISE = 0.48;
const SEAT = 0.62;

const SHIRTS = ["#20242e", "#2d3445", "#5a1f24", "#1d3a5c", "#3b3b3b", "#6b5a3a", "#e8e2d4", "#23452f", "#7a2d7a", "#b8412c", "#141414", "#324c8c"];
const SKINS = ["#e2b08c", "#c68e6a", "#8d5a3c", "#5e3a26", "#f0c8a8", "#b07850"];

/**
 * The crowd: hundreds of simple seated fans drawn as two instanced meshes,
 * with a shader that makes them bob and jump. How hard they move follows
 * the fight's excitement, so a big punch lifts the whole arena. Seeded,
 * so the showcase is the same crowd every time.
 */
export class Crowd {
  readonly group = new THREE.Group();
  /** Where each fan's face is, for camera flashes. */
  readonly faces: THREE.Vector3[] = [];
  private readonly uniforms = { time: { value: 0 }, excite: { value: 0.2 } };
  private readonly geometries: THREE.BufferGeometry[];
  private readonly material: THREE.MeshStandardMaterial;

  constructor() {
    this.material = new THREE.MeshStandardMaterial({ roughness: 0.85, vertexColors: true, color: "#8a8a8a" });
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.time = this.uniforms.time;
      shader.uniforms.excite = this.uniforms.excite;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float time;\nuniform float excite;\nattribute float phase;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          // Each fan bounces on their own beat, and raised arms wave on top.
          float beat = sin(time * (5.0 + phase * 3.0) + phase * 40.0);
          float hop = max(0.0, beat) * excite * 0.22 + sin(time * 1.3 + phase * 20.0) * 0.02;
          transformed.y += hop * (0.4 + 0.6 * smoothstep(0.3, 1.0, position.y));
          transformed.x += sin(time * 2.0 + phase * 30.0) * 0.03 * excite * step(1.05, position.y);`,
        );
    };
    const random = seeded(99);
    const spots = seats(random);
    // Bodies take the shirt colour and heads the skin tone, one instanced mesh each.
    this.geometries = [bodyGeometry(), headGeometry()];
    const bodies = new THREE.InstancedMesh(this.geometries[0], this.material, spots.length);
    const heads = new THREE.InstancedMesh(this.geometries[1], this.material, spots.length);
    const phases = new Float32Array(spots.length);
    const matrix = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const colour = new THREE.Color();
    const up = new THREE.Vector3(0, 1, 0);
    spots.forEach((spot, i) => {
      const size = 0.92 + random() * 0.16;
      scale.set(size, size, size);
      q.setFromAxisAngle(up, spot.yaw);
      matrix.compose(new THREE.Vector3(spot.x, spot.y, spot.z), q, scale);
      bodies.setMatrixAt(i, matrix);
      heads.setMatrixAt(i, matrix);
      bodies.setColorAt(i, colour.set(SHIRTS[Math.floor(random() * SHIRTS.length)]!));
      heads.setColorAt(i, colour.set(SKINS[Math.floor(random() * SKINS.length)]!));
      phases[i] = random();
      this.faces.push(new THREE.Vector3(spot.x, spot.y + 1.1 * size, spot.z));
    });
    for (const mesh of [bodies, heads]) {
      mesh.geometry.setAttribute("phase", new THREE.InstancedBufferAttribute(phases, 1));
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
  }

  update(time: number, excite: number): void {
    this.uniforms.time.value = time;
    this.uniforms.excite.value = excite;
  }

  dispose(): void {
    for (const geo of this.geometries) geo.dispose();
    this.material.dispose();
  }
}

function seats(random: () => number): { x: number; y: number; z: number; yaw: number }[] {
  const spots: { x: number; y: number; z: number; yaw: number }[] = [];
  for (let side = 0; side < 4; side++) {
    const angle = (side * Math.PI) / 2;
    for (let row = 0; row < ROWS; row++) {
      const out = FIRST_ROW + row * ROW_DEPTH;
      const across = out + 0.4;
      for (let a = -across; a <= across; a += SEAT) {
        // A few empty seats, so it reads as real people.
        if (random() < 0.06) continue;
        const jitter = (random() - 0.5) * 0.12;
        const x = Math.sin(angle) * out + Math.cos(angle) * (a + jitter);
        const z = Math.cos(angle) * out - Math.sin(angle) * (a + jitter);
        spots.push({ x, y: -PLATFORM + 0.3 + row * ROW_RISE, z, yaw: angle + Math.PI + (random() - 0.5) * 0.4 });
      }
    }
  }
  return spots;
}

type Part = [THREE.BufferGeometry, string, number, number, number, number?];

/** Parts placed and coloured, merged into one geometry with vertex colours. */
function build(parts: Part[]): THREE.BufferGeometry {
  const flats = parts.map(([geo, colour, x, y, z, rz = 0]) => {
    geo.rotateZ(rz);
    geo.translate(x, y, z);
    const flat = geo.toNonIndexed();
    geo.dispose();
    const c = new THREE.Color(colour);
    const count = flat.getAttribute("position").count;
    const colours = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colours.set([c.r, c.g, c.b], i * 3);
    flat.setAttribute("color", new THREE.BufferAttribute(colours, 3));
    return flat;
  });
  const total = flats.reduce((n, g) => n + g.getAttribute("position").count, 0);
  const out = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "color"]) {
    const data = new Float32Array(total * 3);
    let at = 0;
    for (const g of flats) {
      data.set(g.getAttribute(name).array as Float32Array, at);
      at += g.getAttribute(name).array.length;
    }
    out.setAttribute(name, new THREE.BufferAttribute(data, 3));
  }
  for (const g of flats) g.dispose();
  return out;
}

/** A seated fan's torso, raised arms and seat back. White parts take the shirt colour. */
function bodyGeometry(): THREE.BufferGeometry {
  return build([
    [new THREE.CapsuleGeometry(0.19, 0.34, 3, 8), "#ffffff", 0, 0.62, 0],
    [new THREE.CapsuleGeometry(0.05, 0.3, 2, 6), "#ffffff", 0.22, 0.95, 0.06, -0.35],
    [new THREE.CapsuleGeometry(0.05, 0.3, 2, 6), "#ffffff", -0.22, 0.95, 0.06, 0.35],
    [new THREE.BoxGeometry(0.5, 0.5, 0.08), "#15151c", 0, 0.45, -0.28],
  ]);
}

/** The head and two fists, in the fan's skin tone. */
function headGeometry(): THREE.BufferGeometry {
  return build([
    [new THREE.SphereGeometry(0.12, 10, 8), "#ffffff", 0, 1.08, 0.02],
    [new THREE.SphereGeometry(0.05, 6, 5), "#ffffff", 0.2, 1.22, 0.08],
    [new THREE.SphereGeometry(0.05, 6, 5), "#ffffff", -0.2, 1.22, 0.08],
  ]);
}
