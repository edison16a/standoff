import type { CharacterId } from "../../../characters";
import type { KartDesign } from "../kart-design";
import { buildBlaze } from "./blaze";
import { buildMochi } from "./mochi";
import { buildNova } from "./nova";
import { buildPip } from "./pip";

const BUILDERS: Record<CharacterId, () => KartDesign> = {
  blaze: buildBlaze,
  pip: buildPip,
  nova: buildNova,
  mochi: buildMochi,
};

const cache = new Map<CharacterId, KartDesign>();

/**
 * Each kart is built once per page and shared by every copy of it, on
 * the big screen and in the phone's preview alike.
 */
export function kartDesign(id: CharacterId): KartDesign {
  let design = cache.get(id);
  if (!design) {
    design = BUILDERS[id]();
    cache.set(id, design);
  }
  return design;
}
