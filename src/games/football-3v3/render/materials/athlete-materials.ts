import * as THREE from "three";
import type { TeamId } from "../../teams";
import { paintHelmet } from "../models/helmet-paint";
import { knitNormalMap } from "./fabric";
import { roughFromVertices, skinWrap } from "./shader-patches";

/** How finely players are built and shaded: `high` for a real graphics card, `low` for software drawing and weak devices. */
export type Detail = "high" | "low";

/** Texture sizes for each detail level. */
export const DETAIL = {
  high: { print: 1024, helmet: 1024 },
  low: { print: 512, helmet: 512 },
} as const satisfies Record<Detail, { print: number; helmet: number }>;

/**
 * The materials every player shares, made once per renderer: skin that
 * light soaks into, gear whose shine changes vertex by vertex (glossy
 * cleats, matte socks, wet eyes), each team's clear coated helmet with
 * its paint, the painted steel of the masks and the tinted visors. Each
 * jersey is its own material only because its print carries the
 * player's number and name; all of them share one program and the knit.
 */
export class AthleteMaterials {
  readonly skin: THREE.MeshStandardMaterial;
  readonly gear: THREE.MeshStandardMaterial;
  readonly mask: THREE.MeshStandardMaterial;
  private readonly knit: THREE.DataTexture | null;
  private readonly helmets = new Map<TeamId, { material: THREE.MeshPhysicalMaterial; paint: THREE.Texture }>();
  private readonly visors = new Map<string, THREE.MeshPhysicalMaterial>();
  constructor(readonly detail: Detail, private readonly gloss: THREE.Texture | null) {
    const high = detail === "high";
    this.skin = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    this.skin.onBeforeCompile = (shader) => {
      roughFromVertices(shader);
      if (high) skinWrap(shader);
    };
    this.skin.customProgramCacheKey = () => `fb-skin-${detail}`;
    this.gear = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    this.gear.onBeforeCompile = roughFromVertices;
    this.gear.customProgramCacheKey = () => "fb-gear";
    // Powder coated steel bars, the chin strap and the shell's padded lining all share it.
    this.mask = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0.15, envMap: gloss, envMapIntensity: 0.8 });
    this.mask.onBeforeCompile = roughFromVertices;
    this.mask.customProgramCacheKey = () => "fb-mask";
    this.knit = high ? knitNormalMap() : null;
    this.knit?.repeat.set(70, 52);
  }

  /** A jersey: its print, the knit's little holes, and a soft sheen at grazing angles in the cloth's own colour. */
  jersey(print: THREE.Texture, colour: string): THREE.MeshPhysicalMaterial {
    const high = this.detail === "high";
    return new THREE.MeshPhysicalMaterial({
      map: print,
      vertexColors: true,
      normalMap: this.knit,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: 0.68,
      metalness: 0,
      sheen: high ? 0.6 : 0,
      sheenRoughness: 0.45,
      sheenColor: new THREE.Color(colour).lerp(new THREE.Color("#ffffff"), 0.25),
    });
  }

  /** A team's helmet: its painted shell under a deep clear coat that mirrors the floodlights. */
  helmet(team: TeamId): THREE.MeshPhysicalMaterial {
    const have = this.helmets.get(team);
    if (have) return have.material;
    const paint = paintHelmet(team, DETAIL[this.detail].helmet);
    const material = new THREE.MeshPhysicalMaterial({
      map: paint,
      vertexColors: true,
      roughness: 0.32,
      // Storm's navy has a metal flake; Blaze's red is a solid gloss.
      metalness: team === 0 ? 0.45 : 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMap: this.gloss,
      envMapIntensity: 1.25,
    });
    this.helmets.set(team, { material, paint });
    return material;
  }

  /** A tinted visor, mirrored on the outside. */
  visor(colour: string): THREE.MeshPhysicalMaterial {
    let v = this.visors.get(colour);
    if (!v) {
      v = new THREE.MeshPhysicalMaterial({
        color: colour, metalness: 0.85, roughness: 0.06, transparent: true, opacity: 0.82,
        envMap: this.gloss, envMapIntensity: 1.8, side: THREE.DoubleSide, depthWrite: false,
      });
      this.visors.set(colour, v);
    }
    return v;
  }

  dispose(): void {
    this.skin.dispose();
    this.gear.dispose();
    this.mask.dispose();
    this.knit?.dispose();
    for (const { material, paint } of this.helmets.values()) {
      material.dispose();
      paint.dispose();
    }
    for (const v of this.visors.values()) v.dispose();

    this.helmets.clear();
    this.visors.clear();
  }
}
