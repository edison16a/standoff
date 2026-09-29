import * as THREE from "three";
import { BARRIER, RAMP_LENGTH, TRAIN } from "../../engine/tuning";
import { MeshBuilder } from "../mesh-builder";
import { prefab, textured } from "../prefabs";
import { chevronTexture, stripeTexture } from "../textures";
import { toon } from "../toon";
import { glow } from "./track";
import { shadowPaint } from "./train";

/** Red and white stripes, the one warning every barrier wears, so both kinds read at a glance. */
function stripes(key: string, count: number): THREE.Material {
  return textured(`stripes-${key}`, () => toon({ map: stripeTexture("#ffffff", "#e8312a", count) }));
}

const WHITE = { color: 0xf2f2ee, finish: "satin" as const };
const FOOT = { color: 0x4b4f5a, finish: "satin" as const };

/** A board on a stand across the lane, front face at z = 0: jump it. */
export function lowBarrier(style: number): THREE.Group {
  const wide = style % 2 === 0;
  return prefab(`low-${wide}`, () => {
    const b = new MeshBuilder();
    const board = stripes("low", 6);
    const top = BARRIER.lowTop;
    b.outline(0.03);
    for (const x of [-0.92, 0.92]) {
      // A-frame legs, splayed like a road works barrier.
      for (const dz of [-0.16, 0.16]) b.box(0.1, top + 0.05, 0.1, WHITE, [x, top / 2, -0.17 + dz], [dz * 1.1, 0, 0], 0.025);
      b.box(0.22, 0.08, 0.7, FOOT, [x, 0.04, -0.17], undefined, 0.02);
    }
    b.box(2.1, 0.42, 0.1, board, [0, top - 0.24, -0.12], undefined, 0.03);
    if (wide) b.box(1.95, 0.2, 0.08, board, [0, 0.42, -0.12], undefined, 0.02);
    b.outline(0);
    b.sphere(0.09, glow(0xffa01f), [-0.92, top + 0.06, -0.17]);
    b.panel(2.8, 1.4, shadowPaint(), [0, 0.02, -0.17], [-Math.PI / 2, 0, 0]);
    return b.build("low-barrier");
  });
}

/** A tall frame with a striped board overhead and a gap underneath, front face at z = 0: roll under it. */
export function highBarrier(style: number): THREE.Group {
  const sign = style % 2 === 0;
  return prefab(`high-${sign}`, () => {
    const b = new MeshBuilder();
    const board = stripes("high", 7);
    const bottom = BARRIER.highBottom;
    const top = BARRIER.highTop;
    b.outline(0.03);
    for (const x of [-1.02, 1.02]) {
      b.box(0.14, top, 0.14, WHITE, [x, top / 2, -0.17], undefined, 0.03);
      b.box(0.26, 0.1, 0.9, FOOT, [x, 0.05, -0.17], undefined, 0.02);
    }
    b.box(2.2, 0.8, 0.14, board, [0, bottom + 0.42, -0.12], undefined, 0.03);
    b.box(2.2, 0.12, 0.14, WHITE, [0, top - 0.06, -0.17], undefined, 0.03);
    if (sign) b.box(0.7, 0.5, 0.08, { color: 0x1f6fd6, finish: "satin" }, [0, bottom + 1.18, -0.14], undefined, 0.04);
    b.outline(0);
    if (sign) {
      // A white arrow pointing down on the blue sign: under, not over.
      b.box(0.1, 0.22, 0.02, WHITE, [0, bottom + 1.24, -0.09]);
      b.add(new THREE.ConeGeometry(0.14, 0.16, 3), WHITE, [0, bottom + 1.06, -0.09], [0, 0, Math.PI]);
    }
    for (const x of [-1.02, 1.02]) b.sphere(0.1, glow(0xff3b30), [x, top + 0.1, -0.17]);
    b.panel(2.8, 1.4, shadowPaint(), [0, 0.02, -0.17], [-Math.PI / 2, 0, 0]);
    return b.build("high-barrier");
  });
}

/** A yellow steel ramp up onto a train roof, foot at z = 0, top at z = -7. */
export function ramp(): THREE.Group {
  return prefab("ramp", () => {
    const b = new MeshBuilder();
    const deck = textured("ramp-deck", () => toon({ map: chevronTexture() }));
    const slope = Math.atan2(TRAIN.height, RAMP_LENGTH);
    const length = Math.hypot(TRAIN.height, RAMP_LENGTH);
    const yellow = { color: 0xffc21a, finish: "satin" as const };
    b.panel(2.0, length, deck, [0, TRAIN.height / 2 + 0.02, -RAMP_LENGTH / 2], [-Math.PI / 2 + slope, 0, 0]);
    b.outline(0.035);
    b.box(2.0, 0.12, length, { color: 0x5b6270, finish: "metal" }, [0, TRAIN.height / 2 - 0.05, -RAMP_LENGTH / 2], [slope, 0, 0]);
    for (const x of [-1.05, 1.05]) {
      b.box(0.14, 0.3, length, yellow, [x, TRAIN.height / 2 + 0.12, -RAMP_LENGTH / 2], [slope, 0, 0]);
      for (let i = 1; i <= 3; i++) {
        const z = (-RAMP_LENGTH * i) / 4;
        const y = (TRAIN.height * i) / 4;
        b.box(0.12, y, 0.12, { color: 0x6b7280, finish: "metal" }, [x, y / 2, z]);
      }
    }
    b.outline(0);
    b.panel(2.8, RAMP_LENGTH + 1, shadowPaint(), [0, 0.02, -RAMP_LENGTH / 2], [-Math.PI / 2, 0, 0]);
    return b.build("ramp");
  });
}
