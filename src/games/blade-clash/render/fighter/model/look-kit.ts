import * as THREE from "three";
import { brushedBump, clothBump } from "../../kit/textures";

/**
 * One fighter's materials. Every model gets its own set, made once per
 * colour and finish and shared by all its parts, so a hit can flash the
 * whole body in the hitter's colour without touching the other fighter.
 * Glowing parts keep their own light and never flash.
 */
export class LookKit {
  private readonly cache = new Map<string, THREE.MeshStandardMaterial>();
  private readonly flashing: THREE.MeshStandardMaterial[] = [];
  private readonly owned: THREE.Material[] = [];

  /**
   * Worked metal: armour is brushed, blades are near mirrors. Brushed
   * armour keeps a little diffuse colour, so it reads as steel even where
   * it reflects nothing but a night sky.
   */
  metal(color: THREE.ColorRepresentation, roughness = 0.3, brushed = true): THREE.MeshStandardMaterial {
    return this.made(`metal:${String(color)}:${roughness}:${brushed}`, () => {
      const material = new THREE.MeshStandardMaterial({ color, roughness, metalness: brushed ? 0.78 : 1 });
      if (brushed) {
        material.bumpMap = brushedBump();
        material.bumpScale = 0.2;
      }
      return material;
    });
  }

  /**
   * A polished steel blade with a faint glint of its own, so it stays easy
   * to follow from across the room against dark stands. It never flashes.
   */
  blade(color: THREE.ColorRepresentation, glint = 0.22): THREE.MeshStandardMaterial {
    const key = `blade:${String(color)}:${glint}`;
    let material = this.cache.get(key);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color, roughness: 0.16, metalness: 0.9, emissive: color, emissiveIntensity: glint });
      this.cache.set(key, material);
      this.owned.push(material);
    }
    return material;
  }

  /** Woven cloth and padding, with a fine weave in the light. */
  cloth(color: THREE.ColorRepresentation, roughness = 0.85): THREE.MeshStandardMaterial {
    return this.made(`cloth:${String(color)}:${roughness}`, () => {
      const material = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
      material.bumpMap = clothBump();
      material.bumpScale = 0.35;
      return material;
    });
  }

  /** Leather straps, grips and boots. */
  leather(color: THREE.ColorRepresentation, roughness = 0.6): THREE.MeshStandardMaterial {
    return this.made(`leather:${String(color)}:${roughness}`, () => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05 }));
  }

  /** Glossy lacquer over wood or leather, like a samurai's plates. */
  lacquer(color: THREE.ColorRepresentation, roughness = 0.22): THREE.MeshStandardMaterial {
    return this.made(`lacquer:${String(color)}:${roughness}`, () => new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.12 }));
  }

  /** Flat colour with no sheen, for the Block Hero's painted cubes. */
  matte(color: THREE.ColorRepresentation, roughness = 0.75): THREE.MeshStandardMaterial {
    return this.made(`matte:${String(color)}:${roughness}`, () => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, flatShading: true }));
  }

  /** A textured material made elsewhere, taken into the kit so it flashes and is freed with the rest. */
  adopt<T extends THREE.MeshStandardMaterial>(material: T): T {
    this.flashing.push(material);
    this.owned.push(material);
    return material;
  }

  /** Something that gives off its own light: visors, runes, the energy blade's core. */
  glow(color: THREE.ColorRepresentation, intensity = 2.5): THREE.MeshStandardMaterial {
    const key = `glow:${String(color)}:${intensity}`;
    let material = this.cache.get(key);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
      this.cache.set(key, material);
      this.owned.push(material);
    }
    return material;
  }

  /** Lights the body up in `colour`, `amount` from 0 (off) to 1 (full). */
  flash(colour: THREE.Color, amount: number): void {
    for (const material of this.flashing) {
      material.emissive.copy(colour);
      material.emissiveIntensity = amount * 0.45;
    }
  }

  dispose(): void {
    for (const material of this.owned) material.dispose();
    this.owned.length = 0;
    this.flashing.length = 0;
    this.cache.clear();
  }

  private made(key: string, make: () => THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
    let material = this.cache.get(key);
    if (!material) {
      material = make();
      material.name = key;
      this.cache.set(key, material);
      this.flashing.push(material);
      this.owned.push(material);
    }
    return material;
  }
}
