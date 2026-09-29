import * as THREE from "three";
import { LANES, laneX } from "../../engine/tuning";
import { MeshBuilder } from "../mesh-builder";
import { prefab, repeated, textured } from "../prefabs";
import { glowTexture, gravelTexture } from "../textures";
import { toon } from "../toon";
import type { Theme } from "../world/themes";

/** Scenery is laid in chunks of this many metres, each built from shared prefabs. */
export const CHUNK = 30;
/** Half the width of the gravel bed. The sides start just past it. */
export const BED = 5.3;
const GAUGE = 0.72;

export const glow = (color: number) => ({ color, finish: "glow" as const });

const WOOD = { color: 0x7a5234, finish: "matte" as const };
const STEEL = { color: 0x707885, finish: "metal" as const };
const RAIL_HEAD = { color: 0xdfe5ec, finish: "metal" as const };

/**
 * One chunk of the three tracks, from z = 0 back to -30: warm gravel,
 * wooden sleepers and bright steel rails, a concrete cable trough down
 * each side, and the theme's ground beyond.
 */
export function trackTile(theme: Theme): THREE.Group {
  return prefab(`track-${theme.ground}`, () => {
    const b = new MeshBuilder();
    const bed = textured("gravel-bed", () => toon({ map: repeated(gravelTexture(), "gravel-bed", 5, 14) }));
    b.panel(BED * 2, CHUNK, bed, [0, 0, -CHUNK / 2], [-Math.PI / 2, 0, 0]);
    for (const side of [-1, 1]) {
      b.panel(60, CHUNK, { color: theme.ground, finish: "matte" }, [side * (BED + 30), -0.01, -CHUNK / 2], [-Math.PI / 2, 0, 0]);
      b.box(0.5, 0.22, CHUNK, { color: 0xb9b4aa, finish: "matte" }, [side * (BED - 0.2), 0.11, -CHUNK / 2]);
      b.box(0.36, 0.04, CHUNK, { color: 0x8d887f, finish: "matte" }, [side * (BED - 0.2), 0.23, -CHUNK / 2]);
    }
    for (const lane of LANES) {
      const x = laneX(lane);
      for (let z = -0.35; z > -CHUNK; z -= 0.75) b.box(2.15, 0.12, 0.28, WOOD, [x, 0.06, z]);
      for (const g of [-GAUGE, GAUGE]) {
        b.box(0.16, 0.03, CHUNK, STEEL, [x + g, 0.135, -CHUNK / 2]);
        b.box(0.06, 0.1, CHUNK, STEEL, [x + g, 0.2, -CHUNK / 2]);
        b.box(0.11, 0.05, CHUNK, RAIL_HEAD, [x + g, 0.27, -CHUNK / 2]);
      }
    }
    return b.build("track");
  });
}

const POLE = { color: 0x4b5260, finish: "metal" as const };
const BLACK = { color: 0x23252c, finish: "satin" as const };
const LAMP_OFF = [0x5a1f1f, 0x5a4a1a, 0x1f4a2a] as const;
const LAMP_ON = [0xff3b30, 0xffc21a, 0x3ddc84] as const;

/** The lamps of a signal head, top to bottom red, yellow and green, with `lit` glowing. */
function signalHead(b: MeshBuilder, x: number, y: number, z: number, lit: number, face = 1): void {
  b.outline(0.025).box(0.44, 1.05, 0.3, BLACK, [x, y, z], undefined, 0.08).outline(0);
  for (let i = 0; i < 3; i++) {
    const ly = y + 0.3 - i * 0.3;
    b.box(0.3, 0.05, 0.16, BLACK, [x, ly + 0.12, z + face * 0.2]);
    b.sphere(0.1, i === lit ? glow(LAMP_ON[i]!) : { color: LAMP_OFF[i]!, finish: "gloss" }, [x, ly, z + face * 0.15], [1, 1, 0.5], 12);
  }
}

/** A signal on a post beside the tracks, facing the runner, showing red, yellow or green. */
export function signalPost(side: -1 | 1, lit: number): THREE.Group {
  return prefab(`signal-${side}-${lit}`, () => {
    const b = new MeshBuilder();
    const x = side * (BED - 0.5);
    b.outline(0.02).post(0.08, 4.2, POLE, [x, 2.1, 0], 10);
    b.box(0.5, 0.3, 0.5, { color: 0x9a968c, finish: "matte" }, [x, 0.15, 0]);
    b.box(0.5, 0.06, 0.08, POLE, [x - side * 0.2, 3.1, 0]).outline(0);
    signalHead(b, x - side * 0.42, 3.5, 0, lit);
    return b.build("signal");
  });
}

/** A steel gantry over all three tracks, with a signal head over each track: green, or red over one blocked ahead. */
export function gantry(signals: number): THREE.Group {
  return prefab(`gantry-${signals}`, () => {
    const b = new MeshBuilder();
    const steel = { color: 0x6a7a8e, finish: "metal" as const };
    b.outline(0.03);
    for (const x of [-BED, BED]) {
      b.box(0.32, 7, 0.32, steel, [x, 3.5, 0], undefined, 0.03);
      b.box(0.7, 0.3, 0.7, { color: 0xa39e94, finish: "matte" }, [x, 0.15, 0]);
    }
    b.box(BED * 2 + 0.6, 0.4, 0.34, steel, [0, 6.9, 0], undefined, 0.03);
    b.outline(0);
    // Diagonal braces at the corners, so it reads as a real piece of steelwork.
    for (const x of [-1, 1]) b.box(0.12, 1.6, 0.12, steel, [x * (BED - 0.55), 6.2, 0], [0, 0, x * 0.75]);
    for (const lane of LANES) {
      const x = laneX(lane);
      b.box(0.06, 0.4, 0.06, BLACK, [x, 6.55, 0]);
      signalHead(b, x, 5.9, 0.05, (signals >> (lane + 1)) & 1 ? 0 : 2);
    }
    return b.build("gantry");
  });
}

const lampMaterials = new Map<string, THREE.SpriteMaterial>();

/** A halo round a lamp, which reads as light in the dim tunnels. */
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
