import { Color, Mesh, MeshStandardMaterial, PlaneGeometry, type Scene } from "three";
import { BOARD_DEPTH } from "../stage";
import { splatTexture } from "../textures/sprites";

const POOL = 40;
const VARIANTS = 5;
/** Seconds a stain stays fully wet before it starts to fade. */
const HOLD_S = 5;
const FADE_S = 5;

interface Stain {
  mesh: Mesh;
  material: MeshStandardMaterial;
  age: number;
  opacity: number;
}

/**
 * Juice splatted on the board under every cut fruit, and scorch marks
 * under bombs. They look wet at first and slowly soak away. A fixed pool,
 * so a long round never piles up meshes.
 */
export class Stains {
  private readonly pool: Stain[] = [];
  private next = 0;

  constructor(scene: Scene) {
    const geo = new PlaneGeometry(1, 1);
    for (let i = 0; i < POOL; i++) {
      const material = new MeshStandardMaterial({
        map: splatTexture(i % VARIANTS),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        roughness: 0.18,
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: -1 - (i % 4),
      });
      const mesh = new Mesh(geo, material);
      mesh.visible = false;
      mesh.receiveShadow = true;
      mesh.renderOrder = 1;
      scene.add(mesh);
      this.pool.push({ mesh, material, age: 0, opacity: 0 });
    }
  }

  /** Splats a stain on the board below (x, y). */
  splat(x: number, y: number, color: Color, size: number, opacity = 0.5): void {
    const stain = this.pool[this.next]!;
    this.next = (this.next + 1) % POOL;
    // Juice falls straight back onto the board, a little behind the fruit, as the cover shows.
    stain.mesh.position.set(x * 1.05, y * 1.05, -BOARD_DEPTH + 0.01);
    stain.mesh.rotation.z = Math.random() * Math.PI * 2;
    stain.mesh.scale.setScalar(size * (0.85 + Math.random() * 0.3));
    // Juice soaks into wood darker than it looks in the air.
    stain.material.color.copy(color).multiplyScalar(0.72);
    stain.material.opacity = opacity;
    stain.opacity = opacity;
    stain.age = 0;
    stain.mesh.visible = true;
  }

  update(dt: number): void {
    for (const stain of this.pool) {
      if (!stain.mesh.visible) continue;
      stain.age += dt;
      const fade = stain.age < HOLD_S ? 1 : 1 - (stain.age - HOLD_S) / FADE_S;
      if (fade <= 0) {
        stain.mesh.visible = false;
        continue;
      }
      stain.material.opacity = stain.opacity * fade;
      // Drying juice loses its shine.
      stain.material.roughness = 0.18 + (1 - fade) * 0.5;
    }
  }

  clear(): void {
    for (const stain of this.pool) stain.mesh.visible = false;
  }
}
