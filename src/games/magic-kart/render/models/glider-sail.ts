import * as THREE from "three";

/** Half the wing's span, in metres. The full wing is about twice a kart's length across. */
export const HALF_SPAN = 3;
/** Panels of cloth across each half, each stiffened by a batten along its edge. */
export const PANELS = 5;
const COLUMNS = 4;
const ROWS = 10;

/**
 * A point on one half of the sail. `u` runs from the keel (0) out to the
 * wing tip (1) and `v` from the leading edge (0) back to the trailing
 * edge (1). The leading edge sweeps back, the tips droop, the cloth is
 * cambered like a real wing and billows a little between the battens,
 * and the trailing edge is scalloped between them.
 */
export function sailPoint(u: number, v: number, out = new THREE.Vector3()): THREE.Vector3 {
  const panel = (u * PANELS) % 1;
  const between = Math.sin(Math.PI * panel);
  const lead = 1.05 - u;
  const trail = -1.15 + 0.35 * u + 0.12 * between;
  const camber = 0.24 * Math.sin(Math.PI * v) * (1 - 0.55 * u);
  const billow = 0.07 * between * Math.sin(Math.PI * v);
  return out.set(u * HALF_SPAN, -0.45 * u * u + camber + billow, lead + (trail - lead) * v);
}

/**
 * One half of the sail as cloth panels in alternating colours, with a
 * darker band along the leading edge. Each panel has its own vertices so
 * the colours meet in a crisp seam. `flex` is how free the cloth is to
 * flutter there: nothing at the leading edge, most at the trailing edge
 * between battens.
 */
export function sailGeometry(colors: readonly [string, string], band: string): THREE.BufferGeometry {
  const positions: number[] = [];
  const tints: number[] = [];
  const flex: number[] = [];
  const index: number[] = [];
  const p = new THREE.Vector3();
  const c = new THREE.Color();
  const bandColor = new THREE.Color(band);
  for (let panel = 0; panel < PANELS; panel++) {
    const base = positions.length / 3;
    c.set(colors[panel % 2]!);
    for (let i = 0; i <= COLUMNS; i++) {
      const u = (panel + i / COLUMNS) / PANELS;
      for (let j = 0; j <= ROWS; j++) {
        const v = j / ROWS;
        sailPoint(u, v, p);
        positions.push(p.x, p.y, p.z);
        const tint = v < 0.12 ? bandColor : c;
        tints.push(tint.r, tint.g, tint.b);
        flex.push(v * v * (0.35 + 0.65 * Math.sin((Math.PI * i) / COLUMNS)) * (0.5 + 0.5 * u));
      }
    }
    for (let i = 0; i < COLUMNS; i++) {
      for (let j = 0; j < ROWS; j++) {
        const a = base + i * (ROWS + 1) + j;
        const b = a + ROWS + 1;
        index.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(tints, 3));
  g.setAttribute("flex", new THREE.Float32BufferAttribute(flex, 1));
  g.setIndex(index);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/** Points along the sail at a fixed `u`, from leading to trailing edge, lifted just clear of the cloth. */
export function battenPath(u: number, lift = 0.03): THREE.Vector3[] {
  return Array.from({ length: 9 }, (_, j) => sailPoint(u, j / 8).add(new THREE.Vector3(0, lift, 0)));
}

/** Points along the leading edge from the keel out to the tip. */
export function leadingEdgePath(): THREE.Vector3[] {
  return Array.from({ length: 13 }, (_, i) => sailPoint(i / 12, 0));
}

/**
 * Cloth that ripples in the wind. The sail's `flex` attribute scales a
 * travelling wave, and `flutter` turns it up with the wing open and the
 * kart flying fast. Cheap: a few lines in the vertex shader.
 */
export function flutterMaterial(): THREE.MeshStandardMaterial & { userData: { time: { value: number }; flutter: { value: number } } } {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.62, metalness: 0, envMapIntensity: 0.6 });
  const time = { value: 0 };
  const flutter = { value: 0 };
  material.userData = { time, flutter };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.time = time;
    shader.uniforms.flutter = flutter;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float flex;\nuniform float time;\nuniform float flutter;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float wave = sin(time * 21.0 + position.x * 2.3 - position.z * 3.1) + 0.5 * sin(time * 33.0 + position.x * 5.0);
        transformed.y += wave * flex * flutter * 0.07;`,
      );
  };
  return material as ReturnType<typeof flutterMaterial>;
}
