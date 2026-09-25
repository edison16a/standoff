import * as THREE from "three";
import { LANES, laneX } from "../../engine/tuning";
import { wetGroundTexture } from "../art/night-art";
import { MeshBuilder } from "../mesh-builder";
import { glowTexture, painted } from "../textures";
import type { Theme } from "../world/themes";

/** Scenery is laid in chunks of this many metres, each built from shared prefabs. */
export const CHUNK = 30;
/** The tunnel roof, above a jetpack's flight. */
export const TUNNEL_TOP = 9.2;
const GAUGE = 0.72;

const prefabs = new Map<string, THREE.Group>();
const materials = new Map<string, THREE.Material>();

export function cached(key: string, build: () => THREE.Group): THREE.Group {
  let prefab = prefabs.get(key);
  if (!prefab) {
    prefab = build();
    prefab.userData.sharedGeometry = true;
    prefab.traverse((node) => (node.userData.sharedGeometry = true));
    prefabs.set(key, prefab);
  }
  return prefab.clone();
}

export function textured(key: string, make: () => THREE.Material): THREE.Material {
  let material = materials.get(key);
  if (!material) {
    material = make();
    material.userData.shared = true;
    materials.set(key, material);
  }
  return material;
}

export function repeated(texture: THREE.Texture, key: string, x: number, y: number): THREE.Texture {
  const copy = texture.clone();
  copy.repeat.set(x, y);
  copy.needsUpdate = true;
  copy.userData.shared = true;
  copy.name = key;
  return copy;
}

export const glow = (color: number) => ({ color, finish: "glow" as const });

/** A soft line of light across its width, for the glow a rail casts on the wet ground. */
function stripTexture(): THREE.Texture {
  return painted("strip-glow", 64, 8, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Light added onto the ground in a colour: the glow under a rail, or a sign's reflection in a puddle. */
export function spill(color: number, opacity = 0.5): THREE.Material {
  return textured(`spill-${color}-${opacity}`, () => new THREE.MeshBasicMaterial({ map: stripTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
}

/** A soft pool of coloured light on the wet ground, as a sign's reflection. */
export function pool(color: number, opacity = 0.35): THREE.Material {
  return textured(`pool-${color}-${opacity}`, () => new THREE.MeshBasicMaterial({ map: glowTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
}

/**
 * One chunk of the three tracks, from z = 0 back to -30: wet ground that
 * shines, dark sleepers and rails whose heads glow in the zone's colour,
 * each casting a soft line of light on the ground either side.
 */
export function trackTile(theme: Theme): THREE.Group {
  const rail = theme.neon[0];
  return cached(`track-${theme.verge}-${rail}`, () => {
    const b = new MeshBuilder();
    const bed = textured("wet-bed", () => new THREE.MeshStandardMaterial({ map: repeated(wetGroundTexture(), "wet-bed", 4, 12), roughness: 0.3, metalness: 0.35 }));
    b.panel(9.6, CHUNK, bed, [0, 0, -CHUNK / 2], [-Math.PI / 2, 0, 0]);
    for (const side of [-1, 1]) b.panel(60, CHUNK, { color: theme.verge, finish: "gloss" }, [side * 34.8, -0.02, -CHUNK / 2], [-Math.PI / 2, 0, 0]);
    const sleeper = { color: 0x2c2838, finish: "matte" as const };
    const steel = { color: 0x3a3f4b, finish: "metal" as const };
    for (const lane of LANES) {
      const x = laneX(lane);
      for (let z = -0.3; z > -CHUNK; z -= 0.75) b.box(1.95, 0.1, 0.24, sleeper, [x, 0.05, z]);
      for (const g of [-GAUGE, GAUGE]) {
        b.box(0.16, 0.04, CHUNK, steel, [x + g, 0.12, -CHUNK / 2]);
        b.box(0.07, 0.1, CHUNK, steel, [x + g, 0.17, -CHUNK / 2]);
        b.box(0.075, 0.035, CHUNK, glow(rail), [x + g, 0.235, -CHUNK / 2]);
        b.panel(0.9, CHUNK, spill(rail, 0.45), [x + g, 0.015, -CHUNK / 2], [-Math.PI / 2, 0, 0]);
      }
    }
    return b.build("track");
  });
}

/** A gantry over the tracks carrying the wires, with signal lamps over each track on some and a neon strip under its beam. */
export function gantry(signals: number | null, neon: number): THREE.Group {
  return cached(`gantry-${signals}-${neon}`, () => {
    const b = new MeshBuilder();
    const steel = { color: 0x2f3442, finish: "metal" as const };
    const dark = { color: 0x16171f, finish: "satin" as const };
    for (const x of [-5.1, 5.1]) {
      b.box(0.34, 7, 0.34, steel, [x, 3.5, 0], undefined, 0.04);
      b.box(0.7, 0.3, 0.7, { color: 0x3a3848, finish: "matte" }, [x, 0.15, 0]);
      b.box(0.06, 6.6, 0.06, glow(neon), [x, 3.5, 0.18]);
    }
    b.box(10.6, 0.36, 0.3, steel, [0, 6.9, 0], undefined, 0.04);
    b.box(10.4, 0.06, 0.06, glow(neon), [0, 6.7, 0.16]);
    for (const lane of LANES) {
      const x = laneX(lane);
      b.box(0.05, 0.9, 0.05, dark, [x, 6.3, 0]);
      // The contact wire runs the whole chunk.
      b.box(0.04, 0.04, CHUNK, dark, [x, 5.9, -CHUNK / 2]);
      b.box(0.03, 0.03, CHUNK, dark, [x, 6.5, -CHUNK / 2]);
      if (signals === null) continue;
      // Signal heads hang over each track: green, or red over a track that is blocked ahead.
      b.box(0.5, 1.1, 0.34, dark, [x, 6.1, 0.1], undefined, 0.08);
      const red = (signals >> (lane + 1)) & 1;
      b.sphere(0.13, { color: red ? 0xff3b30 : 0x3a1a1a, finish: red ? "glow" : "satin" }, [x, 6.38, 0.28]);
      b.sphere(0.13, { color: red ? 0x1a3a1a : 0x3ddc84, finish: red ? "satin" : "glow" }, [x, 5.9, 0.28]);
    }
    return b.build("gantry");
  });
}

const lampMaterials = new Map<string, THREE.SpriteMaterial>();

/** A halo round a lamp or a sign, which reads as light in the haze and the tunnels. */
export function lampGlow(size = 2.4, color = 0xffe2a8, opacity = 0.6): THREE.Sprite {
  const key = `${color}-${opacity}`;
  let material = lampMaterials.get(key);
  if (!material) {
    material = new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity });
    material.userData.shared = true;
    lampMaterials.set(key, material);
  }
  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(size);
  sprite.userData.sharedGeometry = true;
  return sprite;
}
