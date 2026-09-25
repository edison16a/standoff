import { hitDamage, isBoss, KINDS, type HitPart, type ZombieKind } from "./zombie-kinds";

export type ZombieState = "walk" | "stagger" | "attack" | "dead";

/**
 * One zombie in a fight. Positions are in the fight's own frame: metres
 * ahead of the team and metres to the right of the road's middle. The
 * renderer places them in the world from there.
 */
export interface Zombie {
  id: number;
  kind: ZombieKind;
  ahead: number;
  side: number;
  /** Where along the front line it is heading. */
  targetSide: number;
  hp: number;
  maxHp: number;
  /** Hit points left on each weak point. Empty for ordinary zombies. */
  weak: number[];
  weakMax: number;
  speed: number;
  damage: number;
  state: ZombieState;
  stateTime: number;
  /** Seconds until the next swing, while in reach. */
  swingIn: number;
  age: number;
  /** A stable random number for how it looks and limps. */
  seed: number;
  /** How it died, so it falls the right way. */
  death: { head: boolean; seat: number } | null;
}

/** A swing lands this long after a zombie first reaches the team. */
const FIRST_SWING = 0.7;
/** How quickly zombies drift sideways toward their spot on the front line, in m/s. */
const DRIFT = 0.35;

/**
 * How far off centre a zombie may stand this far ahead and still be in
 * view, with room to aim at its head. The street narrows to this as the
 * dead close in, so none attacks from past the edge of the screen.
 */
export function sideRoom(ahead: number): number {
  return Math.max(1.1, ahead * 0.7);
}

export function makeZombie(id: number, kind: ZombieKind, ahead: number, side: number, targetSide: number, opts: { hpScale: number; speedScale: number; harm: number; weakHp: number; seed: number }): Zombie {
  const spec = KINDS[kind];
  const boss = isBoss(kind);
  const hp = boss ? 1 : spec.hp * opts.hpScale;
  return {
    id,
    kind,
    ahead,
    side,
    targetSide,
    hp,
    maxHp: hp,
    weak: spec.weakPoints.map(() => opts.weakHp),
    weakMax: opts.weakHp,
    // A little spread in pace so a group never marches in step.
    speed: spec.speed * opts.speedScale * (0.9 + opts.seed * 0.2),
    damage: spec.damage * opts.harm,
    state: "walk",
    stateTime: 0,
    swingIn: FIRST_SWING,
    age: 0,
    seed: opts.seed,
    death: null,
  };
}

export const alive = (z: Zombie) => z.state !== "dead";

/** Weak points still glowing. */
export const weakLeft = (z: Zombie) => z.weak.filter((hp) => hp > 0).length;

/**
 * Moves a zombie on by `dt`. Returns the damage of a swing that landed on
 * the team this step, or 0.
 */
export function stepZombie(z: Zombie, dt: number): number {
  z.age += dt;
  z.stateTime += dt;
  const spec = KINDS[z.kind];
  if (z.state === "dead") return 0;
  if (z.state === "stagger") {
    if (z.stateTime < spec.stagger) return 0;
    setState(z, z.ahead <= spec.reach ? "attack" : "walk");
  }
  const drift = z.targetSide - z.side;
  z.side += Math.sign(drift) * Math.min(Math.abs(drift), DRIFT * dt);
  const room = sideRoom(z.ahead);
  z.side = Math.max(-room, Math.min(room, z.side));
  if (z.state === "walk") {
    // Bosses speed up once half their weak points are gone.
    const enraged = z.weak.length > 0 && weakLeft(z) <= z.weak.length / 2 ? 1.3 : 1;
    z.ahead -= z.speed * enraged * dt;
    if (z.ahead <= spec.reach) {
      z.ahead = spec.reach;
      setState(z, "attack");
      z.swingIn = FIRST_SWING;
    }
    return 0;
  }
  z.swingIn -= dt;
  if (z.swingIn > 0) return 0;
  z.swingIn += spec.attackEvery;
  return z.damage;
}

export interface HitResult {
  damage: number;
  blocked: boolean;
  killed: boolean;
  /** The weak point this hit broke, if any. */
  broke: number | null;
}

/** One bullet landing. Weak point hits carry the point's index. */
export function hitZombie(z: Zombie, part: HitPart, weakIndex: number | null, base: number): HitResult {
  if (!alive(z)) return { damage: 0, blocked: false, killed: false, broke: null };
  const spec = KINDS[z.kind];
  const broken = part === "weak" && (weakIndex === null || (z.weak[weakIndex] ?? 0) <= 0);
  const outcome = hitDamage(z.kind, broken ? "body" : part, base);
  if (outcome.damage <= 0) return { damage: 0, blocked: outcome.blocked, killed: false, broke: null };

  if (part === "weak" && weakIndex !== null) {
    const before = z.weak[weakIndex] ?? 0;
    const dealt = Math.min(before, outcome.damage);
    z.weak[weakIndex] = before - dealt;
    const broke = z.weak[weakIndex]! <= 1e-6 ? weakIndex : null;
    if (broke !== null) z.weak[weakIndex] = 0;
    const killed = weakLeft(z) === 0;
    if (killed) die(z, false);
    else if (broke !== null) knockBack(z, spec.knockback, spec.reach);
    return { damage: dealt, blocked: false, killed, broke };
  }

  const dealt = Math.min(z.hp, outcome.damage);
  z.hp -= outcome.damage;
  // Float dust must never leave a zombie standing on a hair of health.
  if (z.hp <= 1e-6) {
    die(z, part === "head");
    return { damage: dealt, blocked: outcome.blocked, killed: true, broke: null };
  }
  knockBack(z, spec.knockback, spec.reach);
  return { damage: dealt, blocked: outcome.blocked, killed: false, broke: null };
}

function knockBack(z: Zombie, metres: number, reach: number): void {
  z.ahead = Math.max(reach, z.ahead + metres);
  setState(z, "stagger");
}

function die(z: Zombie, head: boolean): void {
  z.hp = 0;
  z.death = { head, seat: 0 };
  setState(z, "dead");
}

function setState(z: Zombie, state: Zombie["state"]): void {
  z.state = state;
  z.stateTime = 0;
}
