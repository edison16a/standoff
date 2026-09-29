/**
 * Every kind of zombie, and the rules for hurting them. Hit points are in
 * the same units as weapon damage, so a walker at 0.6 falls to any rifle
 * round, while a brute at 2 takes three rifle rounds or one to the head.
 * Speeds are for the first stage. Each stage after it runs them faster.
 */
export const ZOMBIE_KINDS = ["walker", "runner", "brute", "armored", "butcher", "surgeon", "hook", "tank", "juggernaut", "behemoth"] as const;
export type ZombieKind = (typeof ZOMBIE_KINDS)[number];

export const BOSS_KINDS = ["butcher", "surgeon", "hook", "tank", "juggernaut", "behemoth"] as const;
export type BossKind = (typeof BOSS_KINDS)[number];

/** The smaller, quicker bosses that come every other stage between the big ones. */
export const MINI_BOSS_KINDS = ["butcher", "surgeon", "hook"] as const satisfies readonly BossKind[];

/** The joints a boss can carry a glowing weak point on. The renderer places them. */
export type Joint = "shoulderL" | "shoulderR" | "elbowL" | "elbowR" | "kneeL" | "kneeR" | "chest";

/** Where a bullet landed on a zombie. Weak points carry their index. */
export type HitPart = "head" | "body" | "limb" | "weak";

export interface KindSpec {
  name: string;
  hp: number;
  /** Walking speed in metres per second, on the first stage. */
  speed: number;
  /** How close it must get to swing at the team, in metres. */
  reach: number;
  damage: number;
  /** Seconds between swings once in reach. */
  attackEvery: number;
  /** Seconds a non lethal hit stops it. */
  stagger: number;
  /** Metres a non lethal hit pushes it back. */
  knockback: number;
  /** Damage taken on the body, as a share. Vests and bosses shrug hits off. */
  bodyTaken: number;
  weakPoints: readonly Joint[];
  /** Hit points of each weak point before scaling for the team. */
  weakHp: number;
  /** Rough standing height, for the renderer and the pitch of its growl. */
  height: number;
}

const common = { reach: 1.5, attackEvery: 1.5, stagger: 0.35, knockback: 0.35, bodyTaken: 1, weakPoints: [], weakHp: 0, height: 1.8 };
/** Bosses only hurt through their weak points, and a broken one sends them reeling. */
const boss = { ...common, hp: 1, bodyTaken: 0, stagger: 1.1, knockback: 1.3 };

export const KINDS: Record<ZombieKind, KindSpec> = {
  walker: { ...common, name: "Walker", hp: 0.6, speed: 1.5, damage: 5 },
  runner: { ...common, name: "Runner", hp: 0.5, speed: 2.9, damage: 4, attackEvery: 1.1, knockback: 0.6, height: 1.7 },
  brute: { ...common, name: "Brute", hp: 2, speed: 1.1, damage: 9, attackEvery: 1.9, stagger: 0.25, knockback: 0.2, height: 2.05 },
  armored: { ...common, name: "Riot zombie", hp: 1, speed: 1.35, damage: 7, bodyTaken: 0.35, knockback: 0.2 },
  // The mini bosses: quicker on their feet, fewer weak points.
  butcher: { ...boss, name: "The Butcher", speed: 0.8, reach: 2.6, damage: 11, attackEvery: 2.4, weakPoints: ["kneeL", "kneeR", "shoulderR"], weakHp: 4, height: 2.9 },
  surgeon: { ...boss, name: "The Surgeon", speed: 1.1, reach: 2.4, damage: 8, attackEvery: 1.6, stagger: 0.9, weakPoints: ["elbowL", "elbowR", "chest"], weakHp: 3.5, height: 2.7 },
  hook: { ...boss, name: "The Hook", speed: 0.9, reach: 2.8, damage: 12, attackEvery: 2.6, weakPoints: ["shoulderL", "kneeL", "kneeR"], weakHp: 4.5, height: 2.8 },
  // The big bosses: huge, slow, and many weak points to break.
  juggernaut: { ...boss, name: "The Juggernaut", speed: 0.55, reach: 3, damage: 15, attackEvery: 2.8, stagger: 1, knockback: 1.2, weakPoints: ["elbowL", "elbowR", "kneeL", "kneeR"], weakHp: 8, height: 3.5 },
  tank: { ...boss, name: "The Tank", speed: 0.5, reach: 3.2, damage: 16, attackEvery: 3, stagger: 1.2, knockback: 1.4, weakPoints: ["shoulderL", "shoulderR", "kneeL", "kneeR"], weakHp: 8, height: 3.4 },
  behemoth: {
    ...boss,
    name: "The Behemoth",
    speed: 0.48,
    reach: 4.1,
    damage: 18,
    attackEvery: 3,
    knockback: 1.2,
    weakPoints: ["shoulderL", "shoulderR", "elbowL", "elbowR", "kneeL", "kneeR", "chest"],
    weakHp: 6.5,
    height: 4.6,
  },
};

export function isBoss(kind: ZombieKind): kind is BossKind {
  return (BOSS_KINDS as readonly string[]).includes(kind);
}

export function isMiniBoss(kind: ZombieKind): boolean {
  return (MINI_BOSS_KINDS as readonly string[]).includes(kind);
}

/** A head shot counts this many times over. */
export const HEAD_MULTIPLIER = 2.5;
/** Arms and legs are harder to put down than the body. */
export const LIMB_MULTIPLIER = 0.8;

export interface HitOutcome {
  damage: number;
  /** The bullet sparked off armour or a boss's hide. */
  blocked: boolean;
}

/** How much one bullet of `base` damage does to this kind, where it landed. A `pierce` round ignores riot armour. */
export function hitDamage(kind: ZombieKind, part: HitPart, base: number, pierce = false): HitOutcome {
  const spec = KINDS[kind];
  if (part === "weak") return { damage: base, blocked: false };
  if (spec.weakPoints.length > 0) return { damage: 0, blocked: true };
  if (part === "head") return { damage: base * HEAD_MULTIPLIER, blocked: false };
  if (part === "limb") return { damage: base * LIMB_MULTIPLIER, blocked: false };
  if (pierce) return { damage: base, blocked: false };
  return { damage: base * spec.bodyTaken, blocked: spec.bodyTaken < 1 };
}

/** Weak points grow with the team, so four players still need to work for a boss. */
export function weakPointHp(kind: ZombieKind, players: number): number {
  return KINDS[kind].weakHp * (1 + 0.6 * Math.max(0, players - 1));
}
