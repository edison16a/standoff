/**
 * A map as data. The engine turns it into geometry for driving and the
 * renderer turns the same data into meshes, so what you see is exactly
 * what you drive on. Positions along the lap are fractions from 0 to 1
 * starting at the finish line, so a feature stays put if the shape is
 * tweaked. Lengths are metres.
 */

export const THEME_IDS = ["beach", "space", "city", "volcano"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

/** A control point of the centre line: x and z on the ground, y the height. */
export type ControlPoint = readonly [x: number, z: number, y?: number];

/** A kicker that lifts the whole road, then drops away at the lip. */
export interface RampDef {
  /** Where the lip is, as a fraction of the lap. */
  at: number;
  length: number;
  height: number;
}

/** A hole in the road straight after a ramp. Miss the jump and you fall. */
export interface GapDef {
  at: number;
  length: number;
}

/** A pair of power up cubes floating over a jump, for gliders to steer through. */
export interface SkyRowDef {
  at: number;
  /** Metres above the road. */
  height: number;
}

/** A glowing strip that gives a short boost when driven over. */
export interface BoostPadDef {
  at: number;
  /** Sideways offset from the centre line, right is positive. */
  offset: number;
}

export type ObstacleKind = "crab" | "sandcastle" | "asteroid" | "satellite" | "drone" | "cone" | "boulder" | "pillar";

export interface ObstacleDef {
  kind: ObstacleKind;
  at: number;
  offset: number;
  radius: number;
  /** Moving obstacles sweep across the road and spin out whoever they touch. */
  sweep?: { amplitude: number; period: number; phase?: number };
}

/** A stretch with no barrier: drive off it and you fall into the void or the sea. */
export interface OpenEdgeDef {
  from: number;
  to: number;
  /** Which side has no barrier, looking along the road. Both when left out. */
  side?: "left" | "right";
}

export interface TrackDef {
  id: string;
  name: string;
  /** One line for the map card. */
  blurb: string;
  theme: ThemeId;
  points: readonly ControlPoint[];
  /** Tarmac width. Kerbs and a run off strip sit either side of it. */
  width: number;
  /** Run off between the kerb and the barrier. */
  shoulder: number;
  ramps: readonly RampDef[];
  gaps: readonly GapDef[];
  boostPads: readonly BoostPadDef[];
  /** Each entry is a row of power up cubes across the road. */
  cubeRows: readonly number[];
  skyRows?: readonly SkyRowDef[];
  obstacles: readonly ObstacleDef[];
  openEdges: readonly OpenEdgeDef[];
}
