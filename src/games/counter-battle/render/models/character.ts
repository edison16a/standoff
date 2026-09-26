import * as THREE from "three";
import { CHARACTERS, type CharacterId } from "../../roster";
import { buildHeavy } from "./heavy";
import { buildOperator } from "./operator";
import { Outfit, type Kit } from "./outfit";
import { buildPro } from "./pro";
import { buildRig, type Rig } from "./rig";
import { buildRunner } from "./runner";

const BUILDERS: Record<CharacterId, (rig: Rig, o: Outfit, kit: Kit) => void> = {
  pro: buildPro,
  operator: buildOperator,
  runner: buildRunner,
  heavy: buildHeavy,
};

/** A skin tone per character, so each one has its own face under the gear. */
export const SKINS: Record<CharacterId, string> = {
  pro: "#e0ac85",
  operator: "#c68a62",
  runner: "#8d5a3b",
  heavy: "#f0c8a8",
};

export interface CharacterModel {
  rig: Rig;
  meshes: THREE.Mesh[];
  dispose(): void;
}

/** One fighter's body in their team's colours, on its own rig. */
export function buildCharacter(id: CharacterId, colours: Omit<Kit, "skin">): CharacterModel {
  const c = CHARACTERS[id];
  const rig = buildRig(c.height, c.bulk);
  const outfit = new Outfit();
  BUILDERS[id](rig, outfit, { ...colours, skin: SKINS[id] });
  const meshes = outfit.build();
  return { rig, meshes, dispose: () => outfit.dispose() };
}
