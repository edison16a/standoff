import * as THREE from "three";
import { glowTexture } from "../textures";

const WARM = new THREE.Color("#ffd89a");
/** The hot white core colour of a lit filament bulb, before its level. */
const HOT = new THREE.Color(1.25, 1.05, 0.72);

/**
 * Every fairground bulb in the booth, drawn in three calls however many
 * there are: instanced glass, instanced brass sockets, and one cloud of
 * glow sprites. Brightness is set per bulb each frame, which is how the
 * marquee chases in the lobby and flashes at the buzzer.
 */
export class Bulbs {
  readonly object = new THREE.Group();
  private readonly glass: THREE.InstancedMesh;
  private readonly glowColours: THREE.BufferAttribute;
  private readonly count: number;
  private readonly colour = new THREE.Color();

  constructor(positions: readonly THREE.Vector3[], facing: readonly THREE.Vector3[]) {
    this.count = positions.length;
    const matrix = new THREE.Matrix4();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();

    // Bulbs are light sources, so they skip tone mapping and burn bright.
    this.glass = new THREE.InstancedMesh(new THREE.SphereGeometry(0.052, 18, 12), new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }), this.count);
    const sockets = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.028, 0.034, 0.06, 14),
      new THREE.MeshStandardMaterial({ color: "#b8923e", metalness: 0.9, roughness: 0.35 }),
      this.count,
    );
    positions.forEach((at, i) => {
      matrix.makeTranslation(at.x, at.y, at.z);
      this.glass.setMatrixAt(i, matrix);
      // Each socket sits behind its bulb, pointing the way the bulb faces.
      quaternion.setFromUnitVectors(up, facing[i] ?? up);
      const behind = at.clone().addScaledVector(facing[i] ?? up, -0.06);
      matrix.compose(behind, quaternion, new THREE.Vector3(1, 1, 1));
      sockets.setMatrixAt(i, matrix);
      this.glass.setColorAt(i, WARM);
    });

    const glowGeometry = new THREE.BufferGeometry().setFromPoints(positions.map((p) => p.clone()));
    this.glowColours = new THREE.BufferAttribute(new Float32Array(this.count * 3), 3);
    glowGeometry.setAttribute("color", this.glowColours);
    const glow = new THREE.Points(
      glowGeometry,
      new THREE.PointsMaterial({
        map: glowTexture(),
        size: 0.95,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    // Glows never block each other, and draw after everything solid.
    glow.renderOrder = 2;
    this.object.add(this.glass, sockets, glow);
  }

  /**
   * `chase` runs a light round the marquee; `flash` blinks them all.
   * Otherwise the bulbs glow steadily with a faint shimmer.
   */
  update(time: number, mode: "steady" | "chase" | "flash"): void {
    const step = Math.floor(time * 7);
    for (let i = 0; i < this.count; i++) {
      let level = 0.92 + 0.08 * Math.sin(time * 3 + i * 1.3);
      if (mode === "chase") level = (i + step) % 3 === 0 ? 1.1 : 0.55;
      if (mode === "flash") level = step % 2 === 0 ? 1.15 : 0.35;
      this.colour.copy(HOT).multiplyScalar(level);
      this.glass.setColorAt(i, this.colour);
      this.glowColours.setXYZ(i, 1 * level, 0.7 * level, 0.36 * level);
    }
    if (this.glass.instanceColor) this.glass.instanceColor.needsUpdate = true;
    this.glowColours.needsUpdate = true;
  }
}
