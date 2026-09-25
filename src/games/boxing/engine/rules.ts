import type { PunchStyle } from "./types";

/** How hard each punch hits, what it costs and how long it takes. */
export interface PunchSpec {
  /** Damage to the body. A head shot does `headDamage` times this. */
  damage: number;
  stamina: number;
  /** From leaving the guard to landing, in milliseconds. */
  travelMs: number;
  /** From landing back to the guard. */
  recoverMs: number;
}

export const PUNCHES: Record<PunchStyle, PunchSpec> = {
  // About fifteen clean body shots of a mix empty the bar.
  jab: { damage: 5, stamina: 7, travelMs: 110, recoverMs: 240 },
  cross: { damage: 7, stamina: 12, travelMs: 140, recoverMs: 320 },
  hook: { damage: 8, stamina: 14, travelMs: 170, recoverMs: 360 },
};

/** Every number that shapes a fight, in one place so balance is easy to find. */
export const RULES = {
  rounds: 4,
  roundMs: 20_000,
  introMs: 3_500,
  /** Between rounds: the walk to the corners, the rest on the stools, and the walk back out. */
  breakMs: 9_000,
  cornerWalkMs: 2_200,
  walkOutMs: 2_200,
  /** Health back over a rest on the stool, about two and a half body shots. */
  breakHeal: 17,
  /** Touching gloves: both hold them out this long, and the touch itself takes this long before the bell. */
  touchHoldMs: 350,
  touchMs: 1_100,
  /** A round starts anyway after this long waiting for the gloves to touch. */
  touchTimeoutMs: 7_000,
  maxHealth: 100,
  maxStamina: 100,
  /** Stamina back per second while not punching. */
  staminaRegen: 15,
  /** A tired punch, thrown without the stamina for it, hits this much as hard. */
  tiredDamage: 0.45,
  /** A head shot does this many times the damage of the same punch to the body. */
  headDamage: 2.5,
  /** Cover this good or better blocks a punch outright. Less only takes some of the sting out. */
  blockAt: 0.8,
  /** A blocked punch still does this share of its damage. */
  blockDamage: 0.1,
  /** Cover counts for this much while stunned, and while rocked by a hit. */
  stunnedCover: 0.4,
  rockedCover: 0.65,
  /**
   * A punch aims where the head is as it winds up, following it this
   * slowly, and commits as it leaves. A quick move of the head in the
   * last moment makes it miss. Distances are metres of the head's move.
   */
  aimFollowMs: 220,
  cleanRadius: 0.11,
  missRadius: 0.2,
  /** A hook sweeps across, so moving sideways takes the head only this far out of its path. */
  hookSweep: 0.4,
  /** Blocking a punch costs the blocker a little stamina. */
  blockStamina: 3,
  /** Missing costs the puncher a little more. */
  missStamina: 3,
  /** After a block or a dodge, how long the counter window stays open. */
  counterMs: 900,
  /** A left jab in the counter window hits this much harder, and stuns. */
  counterJab: 1.7,
  /** Any other punch in the window hits this much harder. */
  counterOther: 1.25,
  /**
   * A stunned boxer staggers back to their corner. They cannot punch, their
   * guard only half works, and they take more. The other boxer traps them
   * there a little longer, then cannot stun them again straight away.
   */
  staggerMs: 2_000,
  staggerTaken: 1.2,
  trapMs: 1_400,
  stunImmuneMs: 3_000,
  /** A head shot this hard or harder stuns, and so does any counter to the head. */
  stunDamage: 20,
  /** A hit this hard or harder rocks the boxer back for longer. */
  heavyDamage: 15,
  /** How long a clean hit rocks a boxer, light and heavy. Rocked boxers cannot block. */
  rockMs: 220,
  heavyRockMs: 420,
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
  /**
   * Fatigue on top of stamina: being hurt, or taking a string of hits,
   * leaves a boxer slower and weaker for a while. It builds per hit, more
   * for a hurt or a streak, drains away each second, and never drops
   * under a floor while health is low.
   */
  fatigue: {
    perHit: 0.06,
    hurt: 0.35,
    streak: 0.25,
    /** This many hits taken inside `streakMs` is a streak. */
    streakHits: 3,
    streakMs: 3_000,
    drainPerS: 0.09,
    lowHealth: 30,
    lowHealthFloor: 0.35,
    /** At full fatigue punches take this much longer, and hit this much softer. */
    slow: 0.5,
    weak: 0.3,
  },
  /** Five seconds left in a round, the timekeeper knocks. */
  warningMs: 5_000,
} as const;
