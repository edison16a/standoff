import { Color, DynamicDrawUsage, InstancedMesh, Matrix4, MeshPhysicalMaterial, Quaternion, SphereGeometry, Vector3 } from "three";
import { GRAVITY } from "../../engine/tuning";

interface Drop {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  age: number;
  life: number;
  color: Color;
}

const CAPACITY = 1400;
const matrix = new Matrix4();
const position = new Vector3();
const scale = new Vector3();
const still = new Quaternion();

/**
 * Glossy juice drops flung out of every cut, like the red beads on the
 * cover. All of them are one instanced mesh, so a frantic round with
 * hundreds of drops in the air is still one draw call.
 */
export class JuiceDrops {
  readonly mesh: InstancedMesh;
  private readonly drops: Drop[] = [];

  constructor() {
    const material = new MeshPhysicalMaterial({ roughness: 0.2, clearcoat: 0.7, clearcoatRoughness: 0.12 });
    this.mesh = new InstancedMesh(new SphereGeometry(1, 10, 8), material, CAPACITY);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    // Make the colour buffer exist before the first frame.
    this.mesh.setColorAt(0, new Color());
  }

  /**
   * A spray of drops from a cut at (x, y). Most fly out sideways from the
   * blade's path, a few follow it, so the splash reads as caused by the slash.
   */
  burst(x: number, y: number, color: Color, count: number, power: number, dir = { x: 0, y: 0 }): void {
    for (let i = 0; i < count; i++) {
      if (this.drops.length >= CAPACITY) this.drops.shift();
      const side = Math.random() < 0.5 ? -1 : 1;
      const spread = Math.random() * power;
      const a = Math.random() * Math.PI * 2;
      const tint = color.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.12);
      this.drops.push({
        x: x + (Math.random() - 0.5) * 0.3,
        y: y + (Math.random() - 0.5) * 0.3,
        z: (Math.random() - 0.3) * 0.6,
        vx: Math.cos(a) * spread * 0.6 - dir.y * side * spread * 0.8 + dir.x * power * 0.35,
        vy: Math.sin(a) * spread * 0.6 + dir.x * side * spread * 0.8 + dir.y * power * 0.35 + 1.5,
        vz: (Math.random() - 0.2) * 3,
        size: 0.035 + Math.random() ** 2 * 0.1,
        age: 0,
        life: 0.7 + Math.random() * 0.8,
        color: tint,
      });
    }
  }

  update(dt: number): void {
    let n = 0;
    for (const d of this.drops) {
      d.age += dt;
      if (d.age >= d.life) continue;
      d.vy -= GRAVITY * dt;
      d.vx *= 1 - 0.8 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.z += d.vz * dt;
      const shrink = Math.min(1, (d.life - d.age) / 0.25);
      position.set(d.x, d.y, d.z);
      // Drops stretch a little along their flight.
      scale.set(d.size * shrink, d.size * shrink * (1 + Math.min(0.6, Math.abs(d.vy) * 0.04)), d.size * shrink);
      matrix.compose(position, still, scale);
      this.mesh.setMatrixAt(n, matrix);
      this.mesh.setColorAt(n, d.color);
      this.drops[n++] = d;
    }
    this.drops.length = n;
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  clear(): void {
    this.drops.length = 0;
    this.mesh.count = 0;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshPhysicalMaterial).dispose();
    this.mesh.dispose();
  }
}
