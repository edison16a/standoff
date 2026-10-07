/**
 * Catches, picks and swats are authored moves too. As a pass comes
 * down, the game logic reads how it will arrive at each player going
 * for it and picks his move before the ball gets there, so the knees
 * bend, the leap leaves the ground or the dive lays out in time:
 *
 * a receiver catches at the chest with bent knees and turns upfield,
 * high points a ball over his head and lands, lays out for one he
 * cannot run under, takes one over the shoulder running away, or hauls
 * in a hot or crowded ball and stumbles with it. A defender in front
 * leaps and picks it, or gets a hand up and swats it away.
 *
 * The hands still decide the outcome (catch/touch.ts); the result then
 * picks how the move finishes: held, dropped off the hands, jarred
 * loose by a hit, swatted down, or missed as the ball goes by.
 */
export const CATCH_KINDS = ["chest", "high", "dive", "shoulder", "stumble", "pick", "swat"] as const;
export type CatchKind = (typeof CATCH_KINDS)[number];

export type CatchResult = "held" | "dropped" | "jarred" | "swatted" | "missed";

/** One player's move for the ball in the air. */
export interface CatchPlan {
  kind: CatchKind;
  /** Seconds since the move was picked. */
  t: number;
  /** Seconds from the pick to the ball reaching the hands, kept up to date as the ball comes. */
  at: number;
  /** The side of the body the ball comes in on: 1 his left. */
  side: 1 | -1;
  /** How high the ball meets him, metres. */
  height: number;
  /** Where he meets it on the ground, for a dive to lay out at. */
  spot: { x: number; z: number };
  result: CatchResult | null;
  /** Seconds since the result. */
  since: number;
}

/** How the ball will arrive at one player, read from its path. */
export interface CatchRead {
  /** Metres up where he meets it. */
  height: number;
  /** The ball's speed then, metres a second. */
  speed: number;
  /** 1 coming at his face, 0 across him, -1 from behind: over the shoulder. */
  facing: number;
  /** Metres from the meeting spot to the nearest opponent. */
  contest: number;
  /** Metres he is still short of the spot when the ball gets there, running flat out. */
  short: number;
  /** What he may do with it: a receiver catches, a defender picks it off or only gets a hand to it. */
  play: "catch" | "pick" | "swat";
}

export const CATCH_PICK = {
  /** Seconds before the ball arrives that a move is picked. */
  lead: 0.5,
  /** Over this height the hands go up and he leaves the ground. */
  high: 2.05,
  /** Below this, or this many metres short, he lays out. */
  low: 0.55,
  short: 0.35,
  /** Coming from this far behind, it is over the shoulder. */
  shoulder: -0.25,
  /** An opponent this close, or a ball this hot, and he stumbles with it. */
  crowd: 1.3,
  hot: 24,
  /** A dive leaves the ground this long before the ball arrives. */
  diveLead: 0.3,
} as const;

/** The move for a ball arriving like this. Pure, so tests can check every case. */
export function catchKindFor(r: CatchRead): CatchKind {
  if (r.play === "swat") return "swat";
  if (r.play === "pick") return "pick";
  if (r.short > CATCH_PICK.short || r.height < CATCH_PICK.low) return "dive";
  if (r.height > CATCH_PICK.high) return "high";
  if (r.facing < CATCH_PICK.shoulder) return "shoulder";
  if (r.contest < CATCH_PICK.crowd || r.speed > CATCH_PICK.hot) return "stumble";
  return "chest";
}

/** How long each move plays on after its result before the player is back to running. */
export const CATCH_AFTER: Record<CatchKind, number> = {
  chest: 0.55, high: 0.6, dive: 0.4, shoulder: 0.5, stumble: 0.55, pick: 0.6, swat: 0.5,
};

/** A drop off the hands with a defender this close was a hit that jarred it loose. */
export const JARRED = 0.75;
