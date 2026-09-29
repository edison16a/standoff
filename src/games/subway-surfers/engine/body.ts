import { laneX, RUNNER, type Lane } from "./tuning";

/** One runner's body on the tracks. Plain data, so a bot can copy it and try moves ahead of time. */
export interface RunnerState {
  distance: number;
  x: number;
  y: number;
  vy: number;
  /** The lane the runner is in, or moving into. */
  lane: Lane;
  grounded: boolean;
  /** Seconds of roll left, and how long this roll has lasted. */
  rollLeft: number;
  rollAge: number;
  /** A jump asked for in the air, kept for a moment to happen on landing. */
  jumpBuffer: number;
  /** Seconds since the feet left an edge without a jump, while a late jump still counts. */
  coyote: number;
  /** Ducked in the air: falling fast, and rolling on landing. */
  slamming: boolean;
  airTime: number;
  /** Seconds left of passing through things, after a save or a flight. */
  ghost: number;
  /** The obstacle that last stopped a lane change, so leaning on one train bumps only once. */
  blockedBy: number | null;
}

export function newRunner(distance = 0, lane: Lane = 0): RunnerState {
  return {
    distance,
    x: laneX(lane),
    y: 0,
    vy: 0,
    lane,
    grounded: true,
    rollLeft: 0,
    rollAge: 0,
    jumpBuffer: 0,
    coyote: 0,
    slamming: false,
    airTime: 0,
    ghost: 0,
    blockedBy: null,
  };
}

export function bodyHeight(s: RunnerState): number {
  return s.rollLeft > 0 ? RUNNER.rollHeight : RUNNER.height;
}
