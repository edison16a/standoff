import type { CharacterId } from "../../../characters";
import type { FarCut, KartDesign } from "../kart-design";
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

const farCache = new Map<CharacterId, FarCut>();

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

/** The coarse cut of a kart, built the first time a race needs it. The phone's turntable never does. */
export function farCut(id: CharacterId): FarCut {
  let cut = farCache.get(id);
  if (!cut) {
    const far = withDetail(FAR_DETAIL, BUILDERS[id]);
    cut = { body: far.body, driver: far.driver, wheels: far.wheels.map((w) => w.geometry) };
    farCache.set(id, cut);
  }
  return cut;
}
