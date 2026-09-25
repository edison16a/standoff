import type { Rng } from "./rng";

/**
 * The four stages as the engine sees them: a solid main platform, a few
 * floating platforms you can jump up through and drop down through, and
 * the blast zone. How each looks is the renderer's business. x runs
 * right and y up, in metres, with the main platform's top at y 0.
 */

export const STAGE_IDS = ["dojo-rooftop", "floating-temple", "crystal-cave", "forest-treetop"] as const;
export type StageId = (typeof STAGE_IDS)[number];

/** A standing surface. Solid ones also block from the sides and below. */
export interface Surface {
  x1: number;
  x2: number;
  top: number;
  /** The underside of a solid block. Pass through platforms have none. */
  bottom: number | null;
}

export interface StageDef {
  id: StageId;
  name: string;
  /** Index 0 is always the main platform. */
  surfaces: Surface[];
  /** Leaving this box costs a life. */
  blast: { left: number; right: number; top: number; bottom: number };
  /** Where the four fighters start, left to right. */
  spawns: number[];
  /** Where respawn platforms come to rest, one per slot. */
  respawns: { x: number; y: number }[];
}

const main = (half: number, depth: number): Surface => ({ x1: -half, x2: half, top: 0, bottom: -depth });
const plat = (x1: number, x2: number, top: number): Surface => ({ x1, x2, top, bottom: null });

export const STAGES: Record<StageId, StageDef> = {
  "dojo-rooftop": {
    id: "dojo-rooftop",
    name: "Dojo Rooftop",
    surfaces: [main(8.5, 2.4), plat(-6, -2.6, 2.1), plat(2.6, 6, 2.1), plat(-1.7, 1.7, 4)],
    blast: { left: -19, right: 19, top: 15, bottom: -9 },
    spawns: [-5.5, -1.8, 1.8, 5.5],
    respawns: [{ x: -3.2, y: 6.5 }, { x: 3.2, y: 6.5 }, { x: -1, y: 7.5 }, { x: 1, y: 7.5 }],
  },
  "floating-temple": {
    id: "floating-temple",
    name: "Floating Temple",
    surfaces: [main(7.5, 3.2), plat(-9, -5.4, 1.9), plat(5.4, 9, 1.9), plat(-2, 2, 3.8)],
    blast: { left: -20, right: 20, top: 15, bottom: -10 },
    spawns: [-5, -1.6, 1.6, 5],
    respawns: [{ x: -3, y: 6.5 }, { x: 3, y: 6.5 }, { x: -1, y: 7.5 }, { x: 1, y: 7.5 }],
  },
  "crystal-cave": {
    id: "crystal-cave",
    name: "Crystal Cave",
    surfaces: [main(9, 2), plat(-5.5, -2, 2), plat(2, 5.5, 2), plat(-7.5, -4.5, 3.9), plat(4.5, 7.5, 3.9)],
    blast: { left: -19.5, right: 19.5, top: 14.5, bottom: -9 },
    spawns: [-6, -2, 2, 6],
    respawns: [{ x: -3.5, y: 6.2 }, { x: 3.5, y: 6.2 }, { x: -1.2, y: 6.8 }, { x: 1.2, y: 6.8 }],
  },
  "forest-treetop": {
    id: "forest-treetop",
    name: "Forest Treetop",
    surfaces: [main(8, 2.8), plat(-7.2, -3.8, 2.1), plat(3.8, 7.2, 2.1), plat(-2.4, 0.4, 4)],
    blast: { left: -19, right: 19, top: 15.5, bottom: -9.5 },
    spawns: [-5.2, -1.7, 1.7, 5.2],
    respawns: [{ x: -3, y: 7 }, { x: 3, y: 7 }, { x: -1, y: 8 }, { x: 1, y: 8 }],
  },
};

export function pickStage(rng: Rng): StageId {
  return rng.pick(STAGE_IDS);
}

/** The main platform, where every fighter starts. */
export function mainSurface(stage: StageDef): Surface {
  return stage.surfaces[0]!;
}

/** Whether the point is over this surface, from edge to edge. */
export function over(surface: Surface, x: number): boolean {
  return x >= surface.x1 && x <= surface.x2;
}
