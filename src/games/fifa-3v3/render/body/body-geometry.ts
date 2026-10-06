import * as THREE from "three";
import type { Look } from "../../looks";
import { addArms } from "./arms";
import { addBoots } from "./boots";
import { bodyCtx } from "./context";
import { handGeometry } from "./hands";
import { buildHead, shapeOf } from "./head/head";
import { addLegs } from "./legs";
import { PartList } from "./parts";
import { addShorts } from "./shorts";
import { addNeck, addShirt } from "./torso";

/** One body's meshes, one per material, all skinned to the same bones. */
export interface BodyGeometry {
  /** Arms, legs, neck, head and bare hands. */
  skin: THREE.BufferGeometry;
  /** Shirt, sleeves, shorts and socks, printed from the kit texture. */
  kit: THREE.BufferGeometry;
  /** Boots, hair, eyes, brows and gloves. */
  gear: THREE.BufferGeometry;
}

/** Real skin under floodlights reads a little deeper than its swatch. */
const deepen = (hex: string) => `#${new THREE.Color(hex).multiplyScalar(0.92).getHexString()}`;

/** Every piece of a player built on the look's own skeleton at rest. Pure geometry, so it can be built and checked anywhere. */
export function bodyGeometry(look: Look, keeper: boolean, fine: boolean): BodyGeometry {
  const c = bodyCtx(look, keeper, fine);
  const tone = deepen(look.skin);
  const skin = new PartList(c.rest);
  const kit = new PartList(c.rest);
  const gear = new PartList(c.rest);
  addShirt(kit, c);
  addShorts(kit, c);
  addArms(skin, kit, c, tone);
  addLegs(skin, kit, c, tone);
  addNeck(skin, c, tone);
  addBoots(gear, c);
  // Heads vary less than heights; a touch over life size keeps faces readable from the stands.
  const k = 1.03 + (c.d.s - 1) * 0.45;
  const head = buildHead({ ...look, skin: tone }, k, fine, shapeOf(look));
  // The head's centre sits over the neck joint, a touch forward of it.
  for (const [geo, list] of [[head.skin, skin], [head.gear, gear]] as const) {
    geo.translate(0, c.d.headUp, 0.012 * c.d.s);
    list.rigid(geo, "neck");
  }
  const gloved = keeper || look.gloves === true;
  for (const side of [1, -1] as const) {
    const colours = gloved ? { back: look.kit.trim, palm: "#e8ecef" } : { back: tone, palm: tone };
    const hand = handGeometry(c, side, colours, gloved ? 1.3 : 1);
    (gloved ? gear : skin).rigid(hand, side > 0 ? "handL" : "handR");
  }
  return { skin: skin.geometry(), kit: kit.geometry(), gear: gear.geometry() };
}

const cache = new WeakMap<Look, Map<string, BodyGeometry>>();

/**
 * The geometry for a look, built once and shared by every player wearing
 * it for the life of the page: a new match, or the lobby's kick about
 * giving way to the real one, then costs no building. Only the kit's
 * print differs between players, and that is a texture.
 */
export function sharedBodyGeometry(look: Look, keeper: boolean, fine: boolean): BodyGeometry {
  let byKind = cache.get(look);
  if (!byKind) cache.set(look, (byKind = new Map()));
  const key = `${keeper}:${fine}`;
  let geo = byKind.get(key);
  if (!geo) byKind.set(key, (geo = bodyGeometry(look, keeper, fine)));
  return geo;
}
