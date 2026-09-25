import type { ScreenPoint } from "@/games/kit/aim/aim-math";
import type { Seat } from "@/platform/protocol";
import { Encounter } from "../engine/encounter";
import { MAX_HEALTH, SurvivalGame } from "../engine/game";
import { Rng } from "../engine/rng";
import { stage } from "../engine/stages";
import type { WeaponId } from "../engine/weapons";
import { alive, type Zombie } from "../engine/zombie";
import type { SurvivalRenderer } from "../render/scene-renderer";
import type { Framing, SceneSource } from "../render/scene-source";
import { ShowcaseBot, type BotRole } from "./bot";
import { EscortSpread } from "./staging";
import { assignTargets, blocked, lanes } from "./targeting";

/** One staged fight: where, with which guns, and how the boss moves. */
export interface ShowcasePlan {
  stage: number;
  players: readonly { weapon: WeaponId; role: BotRole }[];
  /** How far off the boss is pushed back to on every beat, in metres. */
  bossAt: number;
  /** Seconds between the volleys that stagger the boss. The clip lasts a whole number of beats, so it loops. */
  beat: number;
  /** The escort: most standing at once, seconds between arrivals, where they appear, and how many hits they take. */
  escort: { maxAlive: number; gap: number; spawn: [number, number]; tough: number };
  /** Seconds the fight runs before the first frame, so the street is already busy. */
  preroll: number;
  /** How the camera frames the fight, over the game's own view. */
  framing: Framing;
  seed: number;
}

const STEP = 1 / 60;
/** Weak points never drop below this, so the boss stands through the whole clip. */
const WEAK_FLOOR = 20;
/** The stagger's push back takes this long, so the boss reels rather than jumps. */
const REEL = 0.35;

/**
 * The game playing itself for the home screen. It runs the real engine
 * and renderer with computer players and no room. Every random number
 * comes from one seed and time comes only from the frames it is given,
 * so a capture replays exactly. The boss walks in, and on every beat the
 * team's fire staggers it back to the same spot, so the clip loops.
 */
export class ShowcaseDirector implements SceneSource {
  readonly game: SurvivalGame;
  readonly random: () => number;
  private readonly bots: ShowcaseBot[];
  private readonly spread: EscortSpread;
  private clock = 0;
  private last = -1;
  private beats = 0;
  private reel: { from: number; t: number } | null = null;

  constructor(private readonly plan: ShowcasePlan) {
    const rng = new Rng(plan.seed);
    this.random = () => rng.next();
    this.game = new SurvivalGame(this.random);
    this.game.start(plan.players.map((p, i) => ({ seat: i + 1, weapon: p.weapon })), plan.stage);
    while (this.game.phase === "travel") this.game.update(0.25);
    // An endless escort in place of the stage's own count, so the clip never runs dry.
    const spec = { ...stage(plan.stage), count: 10_000, maxAlive: plan.escort.maxAlive, gap: plan.escort.gap, spawn: plan.escort.spawn, tough: plan.escort.tough, packs: 0 };
    this.game.encounter = new Encounter(spec, 1, plan.seed, 5000);
    this.spread = new EscortSpread(spec.zone);
    const sides = lanes(plan.players.length);
    this.bots = plan.players.map((p, i) => new ShowcaseBot(i + 1, p.role, sides[i]!));
    for (let t = 0; t < plan.preroll; t += STEP) this.advance();
    this.game.drain();
  }

  armed(): { seat: Seat; weapon: WeaponId }[] {
    return this.game.squad.present().map((m) => ({ seat: m.seat, weapon: m.gun.weapon }));
  }

  aimAt(seat: Seat): ScreenPoint | null {
    return this.bots[seat - 1]?.aim ?? null;
  }

  /** The zombie a player is after right now, or null. */
  targetOf(seat: Seat): number | null {
    return this.bots[seat - 1]?.target?.zombie ?? null;
  }

  framing(): Framing {
    return this.plan.framing;
  }

  /** Runs the fight up to this frame in fixed steps, and lets the picture react to what happened. */
  update(nowMs: number, view: Pick<SurvivalRenderer, "react">): void {
    if (this.last < 0) this.last = nowMs;
    const until = (nowMs - this.last) / 1000;
    let stepped = 0;
    while (stepped + STEP <= until) {
      this.advance();
      stepped += STEP;
    }
    this.last += stepped * 1000;
    for (const event of this.game.drain()) view.react(event);
  }

  /**
   * After a frame is drawn, so the raycasts see it. Every bot gets a
   * zombie of its own and fires once on it with a clear line. A stray
   * pellet that would strike another zombie is let go, so each player's
   * hits land only on the one it chose.
   */
  shoot(view: Pick<SurvivalRenderer, "targets" | "cast" | "shotFx">, dt: number): void {
    const targets = view.targets();
    const picks = assignTargets(this.bots.map((b) => b.shooter()), targets, this.clock);
    for (const bot of this.bots) {
      const target = picks.get(bot.seat);
      if (!bot.track(target, dt, this.clock) || !target || blocked(target, bot.aim, targets)) continue;
      const cast = (offsets: Parameters<typeof view.cast>[2]) =>
        view.cast(bot.seat, bot.aim, offsets).map((hit) => (hit && hit.zombie !== target.zombie ? null : hit));
      if (!this.game.fire(bot.seat, cast)) continue;
      bot.fired();
      view.shotFx(bot.seat);
    }
  }

  private advance(): void {
    this.clock += STEP;
    this.game.update(STEP);
    // Nobody falls in a trailer.
    this.game.health = MAX_HEALTH;
    this.spread.update(this.game.encounter?.zombies ?? []);
    const boss = this.game.encounter?.zombies.find((z) => z.weak.length > 0 && alive(z));
    if (boss) this.stageBoss(boss);
  }

  private stageBoss(boss: Zombie): void {
    // The boss holds the middle of the road, the star of the shot.
    boss.targetSide = 0;
    for (let i = 0; i < boss.weak.length; i++) boss.weak[i] = Math.max(WEAK_FLOOR, boss.weak[i]!);
    const beat = Math.floor(this.clock / this.plan.beat);
    if (beat !== this.beats) {
      this.beats = beat;
      this.reel = { from: boss.ahead, t: 0 };
      boss.state = "stagger";
      boss.stateTime = 0;
    }
    if (!this.reel) return;
    this.reel.t = Math.min(1, this.reel.t + STEP / REEL);
    const eased = 1 - (1 - this.reel.t) ** 3;
    boss.ahead = this.reel.from + (this.plan.bossAt - this.reel.from) * eased;
    if (this.reel.t >= 1) this.reel = null;
  }
}
