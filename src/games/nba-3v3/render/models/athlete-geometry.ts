import * as THREE from "three";
import type { BuildSpec } from "../../builds";
import { addGear } from "./gear";
import { buildHand } from "./hands";
import { buildHead } from "./head";
import { addKit } from "./kit";
import { limbs } from "./limbs";
import { PartList, tint } from "./parts";
import { buildRig, type Rig } from "./rig";
import { neckInfluence, neckTube, torsoInfluence, torsoTube } from "./torso";

/** Where the head's centre sits over the neck joint: high enough for a real neck, a little forward of it. */
export function headOffset(s: number, k: number): THREE.Vector3 {
  return new THREE.Vector3(0, 0.074 * s + 0.106 * k, 0.014 * s);
}

export interface AthleteGeometry {
  rig: Rig;
  /** Everything drawn in skin: limbs, trunk, neck, head and hands. */
  skin: THREE.BufferGeometry;
  /** The jersey and shorts, printed from the kit texture. */
  kit: THREE.BufferGeometry;
  /** Shoes, socks, bands, sleeves, hair, beard, eyes and brows. */
  gear: THREE.BufferGeometry;
}

/**
 * Every piece of a player, built on the build's own skeleton and merged
 * into one skinned geometry per material. Pure geometry with no
 * textures, so it can be built and checked anywhere. `fine` picks the
 * detail; `referee` dresses the official instead of a player.
 */
export function athleteGeometry(c: BuildSpec, fine: boolean, referee = false): AthleteGeometry {
  const rig = buildRig(c);
  const { s, bulk } = rig.m;
  // Real skin reflects less than its swatch suggests under arena lights.
  const look = { ...c.look, skin: `#${new THREE.Color(c.look.skin).multiplyScalar(0.9).getHexString()}` };

  const skin = new PartList(rig);
  const tone = look.skin;
  for (const limb of limbs(rig, fine ? 20 : 12)) skin.weighted(tint(limb.geo, tone), limb.weigh, 0.42);
  skin.weighted(tint(torsoTube(rig, { n: fine ? 36 : 18, from: -0.1 * s, capStart: 0.03 * s, capEnd: 0.02 * s }), tone), torsoInfluence(rig), 0.44);
  skin.weighted(tint(neckTube(rig, fine ? 20 : 12), tone), neckInfluence(rig), 0.44);
  const headScale = 1 + (c.body.height - 2) * 0.12;
  const head = buildHead(look, headScale, fine);
  const at = headOffset(s, headScale);
  skin.rigid(head.skin.translate(at.x, at.y, at.z), "neck");
  for (const side of [1, -1] as const) skin.rigid(buildHand(look, side, s * (0.97 + 0.03 * bulk), fine), side > 0 ? "handL" : "handR");

  const kit = new PartList(rig);
  addKit(kit, rig, { referee, fine });
  const gear = new PartList(rig);
  addGear(gear, rig, look, fine);
  gear.rigid(head.gear.translate(at.x, at.y, at.z), "neck");
  return { rig, skin: skin.geometry()!, kit: kit.geometry()!, gear: gear.geometry()! };
}

const cache = new WeakMap<BuildSpec, Map<string, AthleteGeometry>>();

/**
 * The geometry for a build, built once and shared by every player of
 * that build for the life of the page: a new game, or the lobby's demo
 * game giving way to the real one, then costs no building at all. Only
 * the kit's print differs between players, and that is a texture.
 */
export function sharedGeometry(c: BuildSpec, fine: boolean, referee = false): AthleteGeometry {
  let byKind = cache.get(c);
  if (!byKind) cache.set(c, (byKind = new Map()));
  const key = `${fine}:${referee}`;
  let geo = byKind.get(key);
  if (!geo) byKind.set(key, (geo = athleteGeometry(c, fine, referee)));
  return geo;
}
