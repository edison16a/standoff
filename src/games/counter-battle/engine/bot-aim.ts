import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import type { Piece } from "./arena";
import { eyeOf, targetPoints, type Fighter } from "./fighter";
import { sightBlocked } from "./geometry";
import type { Rng } from "./rng";
import { STYLES } from "./tactics";
import { dist3, turnTo, type V3 } from "./vec";

/**
 * How a computer player shoots at each level. A new target starts with
 * an aim error that settles over time, the first shot waits on a reaction
 * time, automatic guns fire in bursts, and better bots pull against the
 * kick. Nothing reads what a bot could not see.
 */
export interface Skill {
  reaction: number;
  /** Aim error on a fresh target at 35 m, radians. */
  error: number;
  /** How fast that error settles, per second. */
  settle: number;
  /** How fast the aim can swing, radians per second. */
  turn: number;
  headChance: number;
  /** Share of the kick a bot pulls back against. */
  comp: number;
  burst: [number, number];
  pause: [number, number];
  /** Extra wait between shots of a gun that is not automatic. */
  tap: number;
}

/** The shared Easy, Medium and Hard mapped onto this game's own knobs. Training bots never shoot, so they need none. */
export const SKILLS: Record<Exclude<BotLevel, "training">, Skill> = {
  easy: { reaction: 0.75, error: 0.1, settle: 1.5, turn: 2.4, headChance: 0.08, comp: 0.15, burst: [2, 4], pause: [0.45, 0.8], tap: 0.4 },
  medium: { reaction: 0.45, error: 0.06, settle: 2.5, turn: 3.8, headChance: 0.22, comp: 0.5, burst: [3, 6], pause: [0.3, 0.55], tap: 0.2 },
  hard: { reaction: 0.27, error: 0.035, settle: 3.8, turn: 5.5, headChance: 0.4, comp: 0.8, burst: [4, 8], pause: [0.18, 0.35], tap: 0.08 },
};

export interface BotIntent {
  pull: boolean;
  reload: boolean;
  /** The bot sees an enemy, which holds its peek open. */
  engaged: boolean;
  /** Back behind cover now: after a burst, or to work the bolt or pump, as a player would. */
  duck: boolean;
}

/**
 * How far behind a running target each level's aim trails in a skirmish,
 * in seconds of its run: a fighter who keeps strafing really is harder to
 * hit, and a better bot leads closer.
 */
export const TRAIL: Record<Exclude<BotLevel, "training">, number> = { easy: 0.3, medium: 0.2, hard: 0.12 };
/** In a skirmish a bot holds its fire past this many times its gun's engagement range, so the fight starts once both sides close in. */
export const HOLD_FIRE = 1.6;

/** How likely a bot is to drop back into cover after each burst or single shot. */
const DUCK_AFTER: Record<"auto" | "shotgun" | "sniper", number> = { auto: 0.5, shotgun: 0.55, sniper: 0.9 };

const angleTo = (from: V3, to: V3) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  return { yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
};

export class BotAim {
  private target: number | null = null;
  private seen = 0;
  private err = { yaw: 0, pitch: 0 };
  private head = false;
  private burstLeft = 0;
  private waitUntil = 0;

  /** `skirmish`: the aim trails a running target and holds fire out of range. The cover brain's filmed fight aims as it always did. */
  constructor(private readonly skirmish = false) {}

  /** Forgets the last round's target and timing. */
  reset(): void {
    this.target = null;
    this.seen = 0;
    this.err = { yaw: 0, pitch: 0 };
    this.burstLeft = 0;
    this.waitUntil = 0;
  }

  /** Called each step for a living computer player. It steers `f.aim` and says whether to shoot. */
  update(f: Fighter, enemies: readonly Fighter[], pieces: readonly Piece[], rng: Rng, now: number, dt: number): BotIntent {
    if (f.difficulty === "training") return { pull: false, reload: false, engaged: false, duck: false };
    const skill = SKILLS[f.difficulty];
    const eye = eyeOf(f);
    const visible = enemies.filter((e) => canSee(eye, e, pieces));
    let target = visible.find((e) => e.id === this.target) ?? null;
    if (!target) {
      target = closest(eye, visible);
      if (target) this.acquire(target, eye, skill, rng);
      else this.target = null;
    }
    if (!target) {
      this.seen = 0;
      this.swing(f, { yaw: f.look, pitch: 0 }, skill.turn * 0.6, dt);
      const low = f.gun.ammo < f.gun.spec.magazine * 0.4;
      return { pull: false, reload: low && !f.gun.reloading, engaged: false, duck: false };
    }
    this.seen += dt;
    const settle = Math.exp(-skill.settle * dt);
    this.err.yaw *= settle;
    this.err.pitch *= settle;
    // Being shot shakes a bot's aim, as it would a person's.
    if (now - f.hitAt < dt * 1.5) this.nudge(skill.error * 0.6, rng);
    const points = targetPoints(target);
    const aimed = this.head ? points.head : points.chest;
    const lag = this.skirmish ? TRAIL[f.difficulty] : 0;
    const point = { x: aimed.x - target.vel.x * lag, y: aimed.y, z: aimed.z - target.vel.z * lag };
    const true_ = angleTo(eye, point);
    const want = {
      yaw: true_.yaw + this.err.yaw - f.gun.kick.yaw * skill.comp,
      pitch: true_.pitch + this.err.pitch - f.gun.kick.pitch * skill.comp,
    };
    this.swing(f, want, skill.turn, dt);
    const missYaw = turnTo(true_.yaw, f.aim.yaw + f.gun.kick.yaw);
    const missPitch = f.aim.pitch + f.gun.kick.pitch - true_.pitch;
    const d = dist3(eye, point);
    const tolerance = (this.head ? 0.2 : 0.4) / d + 0.012;
    const onTarget = Math.hypot(missYaw * Math.cos(true_.pitch), missPitch) < tolerance;
    // Buckshot at long range only gives away where you are.
    const inReach = (f.gun.spec.pellets === 1 || d <= f.gun.spec.falloff.end) && (!this.skirmish || d <= STYLES[f.gun.id].engage[0] * HOLD_FIRE);
    const pull = this.seen >= skill.reaction && onTarget && inReach && now >= this.waitUntil && f.gun.ready(now);
    const duck = pull && this.fired(f, skill, rng, now);
    return { pull, reload: false, engaged: true, duck };
  }

  private acquire(target: Fighter, eye: V3, skill: Skill, rng: Rng): void {
    this.target = target.id;
    this.seen = 0;
    this.head = rng.next() < skill.headChance;
    this.burstLeft = 0;
    const far = 1 + dist3(eye, targetPoints(target).chest) / 35;
    this.err = { yaw: 0, pitch: 0 };
    this.nudge(skill.error * far, rng);
  }

  private nudge(size: number, rng: Rng): void {
    const a = rng.next() * Math.PI * 2;
    const r = size * rng.range(0.6, 1.4);
    this.err.yaw += Math.cos(a) * r;
    this.err.pitch += Math.sin(a) * r * 0.6;
  }

  /** Sets up the wait for the next shot. Returns true when the bot should drop back into cover. */
  private fired(f: Fighter, skill: Skill, rng: Rng, now: number): boolean {
    if (!f.gun.spec.auto) {
      this.waitUntil = now + 1 / f.gun.spec.rate + skill.tap * rng.range(0.6, 1.4);
      return rng.next() < DUCK_AFTER[f.gun.id === "sniper" ? "sniper" : "shotgun"];
    }
    if (this.burstLeft <= 0) this.burstLeft = rng.int(...skill.burst);
    this.burstLeft -= 1;
    if (this.burstLeft > 0) return false;
    this.waitUntil = now + rng.range(...skill.pause);
    return rng.next() < DUCK_AFTER.auto;
  }

  private swing(f: Fighter, want: { yaw: number; pitch: number }, rate: number, dt: number): void {
    const dy = turnTo(f.aim.yaw, want.yaw);
    const dp = want.pitch - f.aim.pitch;
    const step = rate * dt;
    // A capped swing speed: a bot far off target takes a moment to come round.
    const k = Math.min(1, step / Math.max(1e-6, Math.hypot(dy, dp)));
    f.aim.yaw += dy * k;
    f.aim.pitch += dp * k;
  }
}

/** Whether a fighter at `eye` can see any part of `e`. */
export function canSee(eye: V3, e: Fighter, pieces: readonly Piece[]): boolean {
  const { chest, head } = targetPoints(e);
  return !sightBlocked(eye, head, pieces) || !sightBlocked(eye, chest, pieces);
}

function closest(eye: V3, fighters: readonly Fighter[]): Fighter | null {
  let best: Fighter | null = null;
  let bestD = Infinity;
  for (const f of fighters) {
    const d = dist3(eye, targetPoints(f).chest);
    if (d < bestD) {
      best = f;
      bestD = d;
    }
  }
  return best;
}
