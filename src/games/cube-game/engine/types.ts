/**
 * The shapes a level is made of. Distances are in blocks, one block being
 * the size of the cube, with x to the right and y up. The floor's top is
 * at y 0. Times are in seconds.
 */

export type Mode = "cube" | "ufo" | "ball";

/** Something solid: the floor, a corridor's ceiling, or a block to land on. */
export interface Solid {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "ground" | "ceiling" | "block";
}

/** A spike one block wide. Up spikes stand on y, down spikes hang from it. */
export interface Spike {
  x: number;
  y: number;
  dir: 1 | -1;
}

/** A jump pad lying on a surface. It launches whoever touches it away from that surface. */
export interface Pad {
  x: number;
  y: number;
  dir: 1 | -1;
}

/** A ring hanging in the air. Jumping while touching it gives a fresh jump. */
export interface Orb {
  x: number;
  y: number;
}

/** A tall gate that changes the mode. Ball and UFO corridors have a ceiling. */
export interface Portal {
  x: number;
  mode: Mode;
  /** The corridor's ceiling from here, or null for open sky. */
  ceiling: number | null;
}

/** Where the speed changes. The level is drawn with a gate there. */
export interface SpeedGate {
  x: number;
  /** Blocks per second from here on. */
  speed: number;
  /** Faster or slower than before, for the arrows on the gate. */
  faster: boolean;
}

export interface LevelInfo {
  id: string;
  name: string;
  /** 1 easy to 5 hardest. */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** Beats per minute of the level's song. Obstacles sit on its beat. */
  bpm: number;
  /** Which theme draws it and which song plays. Both are keyed by the level id. */
  theme: string;
}

/** A level ready to play: everything placed, plus the timing that maps beats to places. */
export interface Level extends LevelInfo {
  solids: Solid[];
  spikes: Spike[];
  pads: Pad[];
  orbs: Orb[];
  portals: Portal[];
  speeds: SpeedGate[];
  /** The mode at the start. */
  startMode: Mode;
  startSpeed: number;
  /** Where the finish line is. */
  endX: number;
  /** How many beats until the finish, for the song's length. */
  beats: number;
  /**
   * A perfect run: the beats on which to jump. Tests play it to prove the
   * level can be finished, and the showcase plays it too.
   */
  solution: number[];
}
