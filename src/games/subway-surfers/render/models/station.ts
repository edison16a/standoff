import { stationSignTexture } from "../art/scenery-art";
import { posterTexture } from "../art/yard-art";
import { textured } from "../prefabs";
import { toon } from "../toon";
import { facing, type Build } from "./city";
import { CHUNK, glow } from "./track";

const NAMES = ["CENTRAL", "HARBOR ST", "PARK LANE", "UPTOWN"];
const CONCRETE = { color: 0xcfc9bd, finish: "matte" as const };
const DARK = { color: 0x3b3f4a, finish: "satin" as const };

/**
 * A station platform along the tracks: a concrete edge with a yellow
 * safety line, a canopy on bright pillars, benches, bins, lamps, a clock,
 * the station's name board and posters on the back wall.
 */
export const platform: Build = (b, side, v, theme) => {
  const inner = 5.4;
  const outer = 10.5;
  const w = outer - inner;
  const cx = side * (inner + w / 2);
  const pillar = { color: theme.accent[v % 3]!, finish: "satin" as const };
  const canopy = { color: theme.accent[(v + 1) % 3]!, finish: "satin" as const };
  b.outline(0.04).box(w, 1.1, CHUNK, CONCRETE, [cx, 0.55, -CHUNK / 2]).outline(0);
  b.box(0.45, 0.02, CHUNK, { color: 0xffc21a, finish: "matte" }, [side * (inner + 0.4), 1.11, -CHUNK / 2]);
  b.box(0.12, 0.2, CHUNK, { color: 0xe9e4da, finish: "matte" }, [side * (inner + 0.02), 1.0, -CHUNK / 2]);
  b.outline(0.04);
  for (let z = -4; z > -CHUNK; z -= 8) {
    b.post(0.17, 3.7, pillar, [side * (outer - 1.4), 2.95, z], 12);
    b.box(0.5, 0.25, 0.5, pillar, [side * (outer - 1.4), 1.22, z], undefined, 0.05);
  }
  // The canopy roof, tipped up toward the tracks, with a white fascia along its edge.
  b.box(w + 0.8, 0.22, CHUNK - 0.2, canopy, [cx + side * 0.2, 4.85, -CHUNK / 2], [0, 0, side * 0.06], 0.06);
  b.box(0.12, 0.45, CHUNK - 0.2, { color: 0xffffff, finish: "matte" }, [side * (inner - 0.15), 4.7, -CHUNK / 2]);
  // Benches and bins between the pillars.
  for (const z of [-8, -24]) {
    b.box(0.5, 0.08, 2.2, { color: 0x9a6a44, finish: "matte" }, [side * (outer - 2.6), 1.55, z], undefined, 0.03);
    b.box(0.08, 0.45, 2.2, { color: 0x9a6a44, finish: "matte" }, [side * (outer - 2.35), 1.85, z], undefined, 0.03);
    for (const dz of [-0.9, 0.9]) b.box(0.4, 0.45, 0.08, DARK, [side * (outer - 2.6), 1.32, z + dz]);
    b.post(0.25, 0.8, { color: 0x3fb54a, finish: "satin" }, [side * (outer - 2.6), 1.5, z + 3], 10);
  }
  // Lamp posts along the edge, and a clock hanging from the canopy.
  for (const z of [-2, -18]) {
    b.post(0.06, 3.3, DARK, [side * (inner + 1.2), 2.75, z], 8);
    b.box(0.4, 0.3, 0.4, DARK, [side * (inner + 1.2), 4.45, z], undefined, 0.05);
  }
  b.tube(0.35, 0.12, { color: 0xffffff, finish: "matte" }, [side * (inner + 1.9), 3.9, -12], 18, 0.35, [0, 0, Math.PI / 2]);
  b.outline(0);
  for (const z of [-2, -18]) b.box(0.3, 0.12, 0.3, glow(0xfff1c4), [side * (inner + 1.2), 4.26, z]);
  const sign = textured(`station-${v % NAMES.length}`, () => toon({ map: stationSignTexture(NAMES[v % NAMES.length]!) }));
  // The name board hangs from the canopy, facing the tracks, with its frame just behind it.
  b.panel(5, 0.94, sign, [side * (inner + 0.64), 3.5, -15], facing(side));
  b.outline(0.03).box(0.1, 1.05, 5.1, DARK, [side * (inner + 0.72), 3.5, -15]).outline(0);
  for (const dz of [-1.6, 1.6]) b.box(0.05, 1.1, 0.05, DARK, [side * (inner + 0.72), 4.3, -15 + dz]);
  // The back wall, with a poster between each pair of pillars.
  b.outline(0.04).box(0.3, 6, CHUNK, { color: 0xe6ddcc, finish: "matte" }, [side * outer, 4, -CHUNK / 2]).outline(0);
  for (const [i, z] of [-8, -24].entries()) {
    const art = textured(`poster-${(v + i) % 4}`, () => toon({ map: posterTexture(v + i) }));
    b.panel(4.2, 2.1, art, [side * (outer - 0.16), 2.6, z], facing(side));
  }
};
