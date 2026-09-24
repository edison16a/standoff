import { OneEuro } from "@/games/kit/aim/one-euro";
import { LANDMARK_COUNT, type Landmark, type Pose } from "./landmarks";

export interface SmoothingOptions {
  /** Smoothing when still, in hertz. Lower is steadier. */
  minCutoff: number;
  /** How quickly smoothing falls away as a point speeds up, for picture points (0 to 1 units). */
  beta: number;
  /** The same for world points, which move in metres. */
  worldBeta: number;
}

/**
 * Tuned so a player standing still does not shimmer, while a punch still
 * reaches full extension a frame or two after the raw points do.
 */
export const DEFAULT_SMOOTHING: SmoothingOptions = { minCutoff: 1.5, beta: 6, worldBeta: 3 };

/** How fast the filters track changes in speed. Higher than the aim's, since a punch starts in a frame. */
const SPEED_CUTOFF = 2.5;

/**
 * Steadies one player's 33 points with a One Euro filter on every axis.
 * The model's points jitter by a few pixels from frame to frame, which a
 * skeleton on a big screen shows and a gesture threshold trips over.
 */
export class LandmarkSmoother {
  private readonly screen: OneEuro[];
  private readonly world: OneEuro[];

  constructor(private readonly options: SmoothingOptions = DEFAULT_SMOOTHING) {
    const make = (beta: number) => Array.from({ length: LANDMARK_COUNT * 3 }, () => new OneEuro(options.minCutoff, beta, SPEED_CUTOFF));
    this.screen = make(options.beta);
    this.world = make(options.worldBeta);
  }

  /** Forgets the past, for when the slot's person changes or comes back after a gap. */
  reset(): void {
    for (const filter of this.screen) filter.reset();
    for (const filter of this.world) filter.reset();
  }

  smooth(pose: Pose, timeMs: number): Pose {
    return {
      landmarks: run(this.screen, pose.landmarks, timeMs),
      world: run(this.world, pose.world, timeMs),
    };
  }

  get settings(): SmoothingOptions {
    return this.options;
  }
}

function run(filters: OneEuro[], points: readonly Landmark[], timeMs: number): Landmark[] {
  return points.map((p, i) => ({
    x: filters[i * 3]!.filter(p.x, timeMs),
    y: filters[i * 3 + 1]!.filter(p.y, timeMs),
    z: filters[i * 3 + 2]!.filter(p.z, timeMs),
    visibility: p.visibility,
  }));
}
