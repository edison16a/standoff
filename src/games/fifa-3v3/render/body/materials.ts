import * as THREE from "three";
import { hairStrands, roughFromVertices, subsurfaceSkin } from "./shader-patches";

/**
 * The materials every player shares, made once per renderer: skin that
 * light soaks into, and gear (boots, hair, eyes, gloves) whose shine
 * varies vertex by vertex. Each kit is its own material only because its
 * print carries the player's name and number; every kit shares one
 * compiled shader and the knit's normal map, which gives the polyester
 * its fine mesh up close and a soft sheen at grazing angles.
 */
export class AthleteMaterials {
  readonly skin: THREE.MeshStandardMaterial;
  readonly gear: THREE.MeshStandardMaterial;
  /** Draws nothing on screen but still casts a shadow: the light cut of a body while its fine cut is shown. */
  readonly shadowOnly = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  private readonly knit: THREE.DataTexture | null;

  constructor(readonly fine: boolean) {
    this.skin = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    this.skin.onBeforeCompile = (shader) => {
      roughFromVertices(shader);
      if (fine) subsurfaceSkin(shader);
    };
    this.skin.customProgramCacheKey = () => `soccer-skin-${fine}`;
    this.gear = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    this.gear.onBeforeCompile = (shader) => {
      roughFromVertices(shader);
      if (fine) hairStrands(shader);
    };
    this.gear.customProgramCacheKey = () => `soccer-gear-${fine}`;
    this.knit = fine ? knitNormalMap() : null;
  }

  /** A kit's cloth: its print with the baked creases in the vertex colours, the knit, and a sheen tinted by the team's colour. */
  kit(print: THREE.Texture, colour: string): THREE.MeshStandardMaterial {
    if (!this.knit) return new THREE.MeshStandardMaterial({ map: print, vertexColors: true, roughness: 0.7, metalness: 0, side: THREE.DoubleSide });
    return new THREE.MeshPhysicalMaterial({
      map: print,
      vertexColors: true,
      normalMap: this.knit,
      // Gentle: a strong knit catches the floodlights all over and washes the colour out.
      normalScale: new THREE.Vector2(0.22, 0.22),
      roughness: 0.72,
      metalness: 0,
      // A sheen in the cloth's own colour, so a red shirt glows red at its edges rather than washing out pink.
      sheen: 0.3,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color(colour),
      side: THREE.DoubleSide,
    });
  }

  dispose(): void {
    this.skin.dispose();
    this.gear.dispose();
    this.shadowOnly.dispose();
    this.knit?.dispose();
  }
}

/**
 * The knit of a football shirt: rows of tiny pores in a fine mesh, as a
 * tiling normal map. Built from a height field so the light catches
 * each ridge between the pores.
 */
export function knitNormalMap(size = 64, cells = 8): THREE.DataTexture {
  const height = (x: number, y: number) => {
    const u = ((x / size) * cells) % 1;
    // Every other row is offset half a cell, like a real mesh knit.
    const row = Math.floor((y / size) * cells);
    const v = ((y / size) * cells) % 1;
    const du = ((u + (row % 2) * 0.5) % 1) - 0.5;
    const dv = v - 0.5;
    return Math.min(1, Math.hypot(du * 1.3, dv) * 2.6);
  };
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = height((x + 1) % size, y) - height((x + size - 1) % size, y);
      const dy = height(x, (y + 1) % size) - height(x, (y + size - 1) % size);
      const n = new THREE.Vector3(-dx * 1.2, -dy * 1.2, 1).normalize();
      data.set([(n.x * 0.5 + 0.5) * 255, (n.y * 0.5 + 0.5) * 255, (n.z * 0.5 + 0.5) * 255, 255], (y * size + x) * 4);
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.repeat.set(46, 58);
  texture.needsUpdate = true;
  return texture;
}
