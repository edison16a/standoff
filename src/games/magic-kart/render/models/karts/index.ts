import type { CharacterId } from "../../../characters";
import type { KartDesign } from "../kart-design";
import { withDetail } from "../kit/detail";
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

/** How much coarser the far version of a kart is cut. */
const FAR_DETAIL = 0.42;

/**
 * Each kart is built once per page and shared by every copy of it, on
 * the big screen and in the phone's preview alike, in full and in a
 * coarse cut for when it is far away.
 */
export function kartDesign(id: CharacterId): KartDesign {
  let design = cache.get(id);
  if (!design) {
    const near = BUILDERS[id]();
    const far = withDetail(FAR_DETAIL, BUILDERS[id]);
    design = { ...near, far: { body: far.body, driver: far.driver, wheels: far.wheels.map((w) => w.geometry) } };
    cache.set(id, design);
  }
  return design;
}
