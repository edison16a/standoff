import type * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Look } from "../../builds";
import type { TeamId } from "../../teams";
import { arm, sleeve } from "./arms";
import { cleat } from "./cleats";
import { faceMask, visorGeometry } from "./face-mask";
import { glove } from "./gloves";
import { face, neck } from "./head";
import { HELMETS } from "./helmet-paint";
import { shellGeometry, type ShellParts } from "./helmet-shell";
import type { KitSpec } from "./kit";
import { leg, pelvis } from "./legs";
import { groups } from "./parts";
import { dimsFor } from "./rig";
import { torso } from "./torso";
import { neckRoll, towel } from "./trimmings";

/** Two levels of detail: the full body for close looks, a lighter one for players far from the camera. */
export type Lod = "near" | "far";

/** How many points and rings each level builds with, as a share of the full count. */
const MESH: Record<Lod, number> = { near: 1, far: 0.5 };

/**
 * Every shape the players are built from, made once and shared: each
 * kind of body at both levels of detail (a player rebuilt for a new name
 * reuses his body), the helmet shell, each team's masks and the visor.
 * Without levels of detail (software drawing) only the far shapes are made.
 */
export class AthleteShapes {
  private readonly made = new Map<string, THREE.BufferGeometry>();
  private readonly shells = new Map<Lod, ShellParts>();

  constructor(private readonly lods: boolean) {}

  /** Which level to use when `near` is asked for. */
  private level(lod: Lod): Lod {
    return this.lods ? lod : "far";
  }

  private once(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
    let g = this.made.get(key);
    if (!g) {
      g = make();
      this.made.set(key, g);
    }
    return g;
  }

  /** The skinned body for a kit: skin, gear and jersey as three groups. */
  body(kit: KitSpec, lod: Lod): THREE.BufferGeometry {
    const l = this.level(lod);
    const key = [l, kit.team, kit.height, kit.build, kit.sleeves, kit.neckRoll, kit.towel, kit.locks, kit.eyeBlack, kit.spats, ...Object.values(kit.look)].join("|");
    return this.once(`body:${key}`, () => bodyGeometry(kit, MESH[l]));
  }

  private shellParts(lod: Lod): ShellParts {
    const l = this.level(lod);
    let s = this.shells.get(l);
    if (!s) {
      s = shellGeometry({ around: Math.round(64 * MESH[l]), rings: Math.round(20 * MESH[l]) });
      this.shells.set(l, s);
    }
    return s;
  }

  /** The helmet shell's painted outside, the same for everyone; the head's scale sizes it. */
  shell(lod: Lod): THREE.BufferGeometry {
    return this.shellParts(lod).outer;
  }

  /** A team's mask in one style, in the team's mask colour, with the shell's lining in the same draw. */
  mask(team: TeamId, look: Look, lod: Lod): THREE.BufferGeometry {
    const l = this.level(lod);
    const style = look.mask === "cage" ? "cage" : "open";
    return this.once(`mask:${l}:${team}:${style}`, () => mergeGeometries([faceMask(look, { colour: HELMETS[team].mask, detail: MESH[l] }), this.shellParts(l).lining], false)!);
  }

  visor(): THREE.BufferGeometry {
    return this.once("visor", visorGeometry);
  }

  dispose(): void {
    for (const g of this.made.values()) g.dispose();
    for (const s of this.shells.values()) {
      s.outer.dispose();
      s.lining.dispose();
    }
    this.made.clear();
    this.shells.clear();
  }
}

/** One body's parts merged into the three material groups the skinned mesh draws. */
export function bodyGeometry(kit: KitSpec, detail: number): THREE.BufferGeometry {
  const d = dimsFor(kit.height, kit.build);
  const skin = [arm(d, kit, 1, detail), arm(d, kit, -1, detail), neck(d, kit, detail), face(d, kit, detail)];
  const gear = [
    pelvis(d, kit, detail), leg(d, kit, 1, detail), leg(d, kit, -1, detail),
    cleat(d, kit, 1, detail), cleat(d, kit, -1, detail), glove(d, kit, 1, detail), glove(d, kit, -1, detail),
  ];
  if (kit.towel) gear.push(towel(d));
  if (kit.neckRoll) gear.push(neckRoll(d, kit, detail));
  const jersey = [torso(d, detail), sleeve(d, kit, 1, detail), sleeve(d, kit, -1, detail)];
  return groups([skin, gear, jersey]);
}
