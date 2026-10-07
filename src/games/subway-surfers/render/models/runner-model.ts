import { Dresser, makeRig, type Rig } from "./rig";
import { dressHead } from "./runner-head";
import { dressLimbs } from "./runner-limbs";
import { RUNNER_DIMS, type Look } from "./runner-look";
import { dressTorso } from "./runner-torso";

export { LOOKS, RUNNER_DIMS, type Look } from "./runner-look";

/**
 * Builds a runner: a cheeky cartoon kid with a big head under a cap, a
 * hoodie and denim vest, a neckerchief, jeans and chunky high tops. Every
 * piece is merged per bone on the cloth material, so the whole kid draws
 * in about forty calls with the ink line, and each fabric keeps its weave.
 */
export function buildRunner(look: Look): Rig {
  const rig = makeRig(RUNNER_DIMS);
  const dress = new Dresser(rig, true);
  dressHead(dress, look);
  dressTorso(dress, look);
  dressLimbs(dress, look);
  return dress.finish();
}
