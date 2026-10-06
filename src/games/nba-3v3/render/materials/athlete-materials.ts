import * as THREE from "three";
import { knitNormalMap } from "./knit";
import { hairFibers, skinPores } from "./micro-detail";
import { roughFromVertices, subsurfaceSkin } from "./shader-patches";

/** How finely players are built: `high` for a real graphics card, `low` for software drawing and weak devices. */
export type AthleteDetail = "high" | "low";

/**
 * The materials every player shares, made once per renderer: skin with
 * light soaking under it, and gear (shoes, socks, hair, eyes, bands)
 * whose shine varies vertex by vertex. Each kit is its own material
 * only because its print carries the player's name and number; all of
 * them share one compiled shader and the knit's normal map.
 */
export class AthleteMaterials {
  readonly skin: THREE.MeshStandardMaterial;
  readonly gear: THREE.MeshStandardMaterial;
  private readonly knit: THREE.DataTexture;

  constructor(readonly detail: AthleteDetail = "high") {
    this.skin = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    const fine = detail === "high";
    this.skin.onBeforeCompile = (shader) => {
      roughFromVertices(shader);
      subsurfaceSkin(shader);
      if (fine) skinPores(shader);
    };
    this.skin.customProgramCacheKey = () => `athlete-skin-${detail}`;
    this.gear = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    this.gear.onBeforeCompile = (shader) => {
      roughFromVertices(shader);
      if (fine) hairFibers(shader);
    };
    this.gear.customProgramCacheKey = () => `athlete-gear-${detail}`;
    this.knit = knitNormalMap();
    this.knit.repeat.set(110, 120);
  }

  /** A kit's cloth: its print, the knit, and a soft sheen at grazing angles tinted by the team's colour. */
  kit(print: THREE.Texture, colour: string): THREE.MeshPhysicalMaterial {
    const high = this.detail === "high";
    return new THREE.MeshPhysicalMaterial({
      map: print,
      normalMap: high ? this.knit : null,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughness: 0.62,
      metalness: 0,
      // A sheen in the cloth's own colour keeps the kit saturated; a white one would wash it out.
      sheen: high ? 0.55 : 0,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color(colour).lerp(new THREE.Color("#ffffff"), 0.18),
      alphaTest: 0.5,
      alphaToCoverage: high,
      side: THREE.DoubleSide,
    });
  }

  dispose(): void {
    this.skin.dispose();
    this.gear.dispose();
    this.knit.dispose();
  }
}
