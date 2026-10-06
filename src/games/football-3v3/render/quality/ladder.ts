/**
 * What a frame may spend. A fast card gets everything; a slow one walks
 * down a ladder of cheaper pictures until its frames fit inside 60 a
 * second. Each rung gives up the thing that costs most for what it shows
 * least: first the second set of shadows, then a little resolution, then
 * half the multisampling, and so on down to six tenths of full resolution
 * with no multisampling and no bloom.
 */
export interface Tier {
  /** Multisampled antialiasing in the finish: 4, 2 or none. */
  samples: 0 | 2 | 4;
  /** Shadow casting floodlights: the key, and on the top rung a second from the far stand. */
  shadowLights: 1 | 2;
  /** The shadow map's size, texels a side. */
  shadowMap: 1024 | 2048;
  bloom: boolean;
  /** Fans in the upper deck too; the leanest rungs keep only the lower deck's. */
  fullCrowd: boolean;
}

const FULL: Tier = { samples: 4, shadowLights: 2, shadowMap: 2048, bloom: true, fullCrowd: true };
const ONE_SHADOW: Tier = { ...FULL, shadowLights: 1 };
const HALF_MSAA: Tier = { ...ONE_SHADOW, samples: 2 };
const LEAN: Tier = { samples: 0, shadowLights: 1, shadowMap: 1024, bloom: false, fullCrowd: false };

export interface Rung {
  tier: Tier;
  /** Share of full resolution drawn. */
  scale: number;
}

export const LADDER: readonly Rung[] = [
  { tier: FULL, scale: 1 },
  { tier: ONE_SHADOW, scale: 1 },
  { tier: ONE_SHADOW, scale: 0.9 },
  { tier: HALF_MSAA, scale: 0.9 },
  { tier: HALF_MSAA, scale: 0.8 },
  { tier: LEAN, scale: 0.8 },
  { tier: LEAN, scale: 0.7 },
  { tier: LEAN, scale: 0.6 },
];

/** Card time a frame may take, in milliseconds: 60 a second with room for everything else. */
export const BUDGET_MS = 12;
/** Under this the picture climbs back a rung. */
const ROOM_MS = 7;
/** Frames between steps down, and the longer wait before a step back up, so one slow frame never moves it. */
const SETTLE_DOWN = 40;
const SETTLE_UP = 180;

export interface Climb {
  rung: number;
  /** Smoothed card time per frame, or null before any is known. */
  ms: number | null;
  since: number;
}

export const climb = (rung = 0): Climb => ({ rung, ms: null, since: 0 });

/** Takes one frame's card time; returns whether the rung changed. */
export function judge(c: Climb, ms: number): boolean {
  c.ms = c.ms === null ? ms : c.ms + (ms - c.ms) * 0.05;
  c.since++;
  if (c.ms > BUDGET_MS && c.since >= SETTLE_DOWN && c.rung < LADDER.length - 1) {
    c.rung++;
  } else if (c.ms < ROOM_MS && c.since >= SETTLE_UP && c.rung > 0) {
    c.rung--;
  } else return false;
  c.since = 0;
  // A new rung costs something new: forget the old average, but not so far that it swings straight back.
  c.ms = c.ms > BUDGET_MS ? BUDGET_MS : ROOM_MS + 1;
  return true;
}

/** One step down without a card time to go on, when frames are known to be missing their slot. */
export function stepDown(c: Climb): boolean {
  if (c.rung >= LADDER.length - 1) return false;
  c.rung++;
  c.since = 0;
  return true;
}
