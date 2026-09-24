import type { PunchStyle } from "./types";

/** How hard each punch hits, what it costs and how long it takes. */
export interface PunchSpec {
  damage: number;
  stamina: number;
  /** From leaving the guard to landing, in milliseconds. */
  travelMs: number;
  /** From landing back to the guard. */
  recoverMs: number;
}

export const PUNCHES: Record<PunchStyle, PunchSpec> = {
  jab: { damage: 3.5, stamina: 7, travelMs: 110, recoverMs: 240 },
  cross: { damage: 6, stamina: 12, travelMs: 140, recoverMs: 320 },
  hook: { damage: 7.5, stamina: 14, travelMs: 170, recoverMs: 360 },
};

/** Every number that shapes a fight, in one place so balance is easy to find. */
export const RULES = {
  rounds: 3,
  roundMs: 60_000,
  breakMs: 7_000,
  introMs: 3_500,
  maxHealth: 100,
  maxStamina: 100,
  /** Stamina back per second while not punching. */
  staminaRegen: 15,
  /** A tired punch, thrown without the stamina for it, hits this much as hard. */
  tiredDamage: 0.45,
  /** A blocked punch still does this share of its damage. */
  blockDamage: 0.1,
  /** Blocking a punch costs the blocker a little stamina. */
  blockStamina: 3,
  /** Missing costs the puncher a little more. */
  missStamina: 3,
  /** After a block or a dodge, how long the counter window stays open. */
  counterMs: 900,
  /** A left jab in the counter window hits this much harder, and staggers. */
  counterJab: 2.6,
  /** Any other punch in the window hits this much harder. */
  counterOther: 1.4,
  /** A staggered boxer can neither punch nor block for this long, and takes more damage. */
  staggerMs: 1_000,
  staggerTaken: 1.25,
  /** A hit this hard or harder rocks the boxer back for longer. */
  heavyDamage: 8,
  /** How long a clean hit rocks a boxer, light and heavy. Rocked boxers cannot block. */
  rockMs: 220,
  heavyRockMs: 420,
  /** The guard must be up this long to block, so flicking it up at the last moment is not free. */
  guardSettleMs: 60,
  /** A new punch may start this long after the previous one lands. */
  chainMs: 40,
  /** Knockdowns: the count starts after the fall, then ticks once a second. */
  fallMs: 1_400,
  countMs: 1_000,
  /** How long both gloves must stay raised to get up. */
  raiseHoldMs: 450,
  riseMs: 1_300,
  /** After getting up, a moment to reset before the fight goes on. */
  resumeMs: 900,
  /** Health back after getting up from the first knockdown, then the second. */
  getUpHealth: [55, 35] as const,
  /** The third knockdown ends the fight. */
  knockdownsToStop: 3,
  /** How long a stoppage lies on the canvas before the fight is called. */
  stoppageMs: 1_800,
  /** Ten seconds left in a round, the timekeeper knocks. */
  warningMs: 10_000,
} as const;
