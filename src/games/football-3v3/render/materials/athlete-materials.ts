import * as THREE from "three";
import type { Look } from "../../builds";
import type { TeamId } from "../../teams";
import { faceMask, visorGeometry } from "../models/face-mask";
import { HELMETS, paintHelmet } from "../models/helmet-paint";
import { shellGeometry, type ShellParts } from "../models/helmet-shell";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { knitNormalMap } from "./fabric";
import { roughFromVertices, skinWrap } from "./shader-patches";

/** How finely players are built and shaded: `high` for a real graphics card, `low` for software drawing and weak devices. */
export type Detail = "high" | "low";

/** Geometry density and texture size for each detail level. */
export const DETAIL = {
  high: { mesh: 1, print: 1024, helmet: 1024 },
  low: { mesh: 0.55, print: 512, helmet: 512 },
} as const satisfies Record<Detail, { mesh: number; print: number; helmet: number }>;

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
  /** Shapes every player of a kind shares: the shell, each team's masks, the visor. */
  private readonly shapes = new Map<string, THREE.BufferGeometry>();
  private shellCache: ShellParts | null = null;

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

  private shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
    let g = this.shapes.get(key);
    if (!g) {
      g = make();
      this.shapes.set(key, g);
    }
    return g;
  }

  private shellParts(): ShellParts {
    if (!this.shellCache) {
      const m = DETAIL[this.detail].mesh;
      this.shellCache = shellGeometry({ around: Math.round(64 * m), rings: Math.round(20 * m) });
    }
    return this.shellCache;
  }

  /** The helmet shell's painted outside, the same for everyone; the head's scale sizes it. */
  shell(): THREE.BufferGeometry {
    return this.shellParts().outer;
  }

  /** A team's mask in one style, painted in the team's mask colour, with the shell's lining in the same draw. */
  faceMask(team: TeamId, look: Look): THREE.BufferGeometry {
    const style = look.mask === "cage" ? "cage" : "open";
    return this.shape(`mask:${team}:${style}`, () => mergeGeometries([faceMask(look, { colour: HELMETS[team].mask, detail: DETAIL[this.detail].mesh }), this.shellParts().lining], false)!);
  }

  visorShape(): THREE.BufferGeometry {
    return this.shape("visor", visorGeometry);
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
    for (const g of this.shapes.values()) g.dispose();
    this.shellCache?.outer.dispose();
    this.shellCache?.lining.dispose();
    this.shellCache = null;
    this.helmets.clear();
    this.visors.clear();
    this.shapes.clear();
  }
}
