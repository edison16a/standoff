import type * as THREE from "three";
import type { CharacterId } from "../../roster";
import { buildBear } from "./bear";
import { buildKarate } from "./karate";
import { buildMage } from "./mage";
import { buildRig, type Rig, type RigSpec } from "./rig";
import { buildSamurai } from "./samurai";

const BUILDERS: Record<CharacterId, (tint: string | null) => RigSpec> = {
  karate: buildKarate,
  samurai: buildSamurai,
  mage: buildMage,
  bear: buildBear,
};

/**
 * A fighter's model on its rig. `tint` is the player's colour when two
 * players picked the same fighter, so they can tell theirs apart, or
 * null for the fighter's own colours.
 */
export function buildFighter(character: CharacterId, tint: string | null, solid: THREE.Material, glow: THREE.Material): Rig {
  return buildRig(BUILDERS[character](tint), solid, glow);
}
