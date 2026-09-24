/**
 * Where everything in the booth sits, in metres. The engine hit tests
 * against these numbers and the renderer builds its models from the same
 * ones, so a shot always lands where the picture says it does.
 *
 * x runs left to right across the booth, y is up, and z points out of the
 * booth toward the players, so the back wall has the lowest z.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** The booth's opening: posts at each side, wall at the back, counter at the front. */
export const BOOTH = {
  halfWidth: 4.7,
  wallZ: -3.1,
  topY: 4.3,
  counterZ: 1.15,
  counterTopY: 0.42,
} as const;

/** How far past the posts things travel before they enter or leave, so they slide in from behind them. */
export const OFFSTAGE_X = BOOTH.halfWidth + 0.9;

/** A cut out blue wave the ducks ride behind. Its top edge is a sum of two sines. */
export interface WaveBoard {
  z: number;
  baseY: number;
  amp: number;
  /** Metres per wave crest. */
  length: number;
  phase: number;
}

/** Back to front. Each hides the rail of the lane just behind it. */
export const BOARDS: readonly WaveBoard[] = [
  { z: -2.2, baseY: 1.72, amp: 0.13, length: 2.3, phase: 0.6 },
  { z: -1.2, baseY: 1.1, amp: 0.12, length: 2.0, phase: 2.1 },
  { z: -0.3, baseY: 0.5, amp: 0.11, length: 1.7, phase: 4.0 },
];

/** The height of a wave board's top edge at x. */
export function boardTop(board: WaveBoard, x: number): number {
  const k = (Math.PI * 2) / board.length;
  return board.baseY + board.amp * Math.sin(k * x + board.phase) + board.amp * 0.3 * Math.sin(k * 2.3 * x + board.phase * 1.7);
}

export type LaneId = "rail" | "pop" | "back" | "front";

/**
 * The tracks targets move along. Duck lanes carry ducks across behind a
 * wave board, the pop lane raises bullseyes from behind the back board,
 * and the rail runs small fast plates high across the wall.
 */
export interface Lane {
  id: LaneId;
  z: number;
  /** The height of the hinge every target on this lane stands on. */
  y: number;
  /** Direction of travel, 1 to the right. Pop ups pick their own. */
  dir: 1 | -1;
  /** Metres per second at the start of a round. */
  speed: number;
}

export const LANES: Record<LaneId, Lane> = {
  rail: { id: "rail", z: -2.75, y: 3.28, dir: 1, speed: 2.3 },
  pop: { id: "pop", z: -2.55, y: 1.62, dir: 1, speed: 0.5 },
  back: { id: "back", z: -1.62, y: 0.93, dir: 1, speed: 0.95 },
  front: { id: "front", z: -0.72, y: 0.33, dir: -1, speed: 1.3 },
};

/** How high a pop up target's stick lifts it when fully up. */
export const POP_RISE = 1.25;

/** Where the camera stands. The render uses a three.js camera made from this. */
export const CAMERA = {
  position: { x: 0, y: 1.95, z: 6.4 },
  lookAt: { x: 0, y: 1.72, z: -1 },
  fov: 42,
} as const;
