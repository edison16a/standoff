import type * as THREE from "three";
import type { MeshBuilder } from "../../kit/mesh-builder";
import type { WeaponKind } from "../characters";
import type { LookKit } from "../model/look-kit";
import { energyBlade, type EnergyBlade } from "./energy-blade";
import { pixelSword } from "./pixel-sword";
import { katana, longsword } from "./steel-blades";

/**
 * Builds a character's weapon on the sword bone. Steel and pixels merge
 * with the model; the energy blade also hands back its light, which the
 * model keeps shimmering.
 */
export function buildWeapon(b: MeshBuilder, kit: LookKit, kind: WeaponKind, length: number, trim: THREE.Color): EnergyBlade | null {
  if (kind === "longsword") longsword(b, kit, length);
  else if (kind === "katana") katana(b, kit, length);
  else if (kind === "pixel") pixelSword(b, kit, length);
  else return energyBlade(b, kit, length, trim);
  return null;
}
