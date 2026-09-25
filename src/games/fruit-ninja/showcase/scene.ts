import { playerColor } from "@/games/kit/players";
import { Arena } from "../engine/arena";
import { Blade } from "../engine/blade";
import { Combos } from "../engine/combos";
import type { Body, MatchEvent, ScoreReason, Seat } from "../engine/events";
import { KINDS } from "../engine/fruit-kinds";
import type { Vec2 } from "../engine/geometry";
import { GRAVITY, POINTS, STUN_S } from "../engine/tuning";
import type { RenderFrame } from "../render/fruit-renderer";
import { BotPath } from "./bot-path";
import { flight, launchOf, type Bot, type Script, type Throw } from "./script";

/** How quickly a gliding hand catches up with where it should be, in seconds. */
const GLIDE_EASE_S = 0.03;

/**
 * The game playing itself from a script: the real arena, blades, combos
 * and scores, with computer players whose hands follow the script. It
 * knows nothing about drawing, so the same film can be checked in a test.
 */
export class ShowcaseScene {
  readonly arena = new Arena();
  /** Seconds since the film began. */
  time = 0;
  private readonly blades = new Map<Seat, Blade>();
  private readonly hands: { bot: Bot; path: BotPath; at: Vec2 | null }[];
  private readonly stuns = new Map<Seat, number>();
  private readonly scores = new Map<Seat, number>();
  private readonly combos = new Combos();
  /**
   * Each throw by its name and which period threw it, with the last time
   * it was seen in the air. A cut fruit is kept a while, so a slash's
   * follow through still knows where it was.
   */
  private readonly flying = new Map<string, { body: Body; seen: number }>();
  private readonly byId: Map<string, Throw>;

  constructor(
    private readonly script: Script,
    halfWidth: number,
  ) {
    this.arena.halfWidth = halfWidth;
    this.byId = new Map(script.throws.map((spec) => [spec.id, spec]));
    this.hands = script.bots.map((bot) => ({ bot, path: new BotPath(bot, script.period, (fruit, at) => this.locate(fruit, at)), at: null }));
    for (const { bot } of this.hands) this.blades.set(bot.seat, new Blade());
  }

  step(dt: number): MatchEvent[] {
    const { period } = this.script;
    const before = this.time;
    this.time += dt;
    const events: MatchEvent[] = [];
    for (const spec of this.script.throws) {
      const round = Math.floor((this.time - spec.t) / period);
      if (round === Math.floor((before - spec.t) / period)) continue;
      const body = this.arena.launch(launchOf(spec));
      this.flying.set(`${spec.id}#${round}`, { body, seen: this.time });
      events.push({ type: "spawn", body });
    }
    for (const [seat, left] of this.stuns) this.stuns.set(seat, left - dt);
    // A hand cuts only in its slashes, so a glide between them never takes a fruit meant for someone else.
    const slashing = new Set(this.hands.filter(({ path }) => path.cutting(this.time)).map(({ bot }) => bot.seat));
    for (const hand of this.hands) {
      const target = hand.path.at(this.time);
      // A slash is followed exactly, to meet its fruit. A glide eases after its target instead, which
      // jumps whenever a hit knocks the big melon off its predicted course.
      const ease = slashing.has(hand.bot.seat) || !hand.at ? 1 : 1 - Math.exp(-dt / GLIDE_EASE_S);
      const from = hand.at ?? target;
      hand.at = { x: from.x + (target.x - from.x) * ease, y: from.y + (target.y - from.y) * ease };
      this.blades.get(hand.bot.seat)!.move(hand.at, this.time);
    }
    const canCut = (seat: Seat) => slashing.has(seat) && (this.stuns.get(seat) ?? 0) <= 0;
    for (const event of this.arena.step(dt, this.blades, canCut)) {
      events.push(event);
      if (event.type === "slice" || event.type === "burst") {
        const rare = KINDS[event.body.kind].class === "rare";
        const reason: ScoreReason = event.type === "burst" ? "burst" : rare ? "rare" : "fruit";
        events.push(this.add(event.seat, event.type === "burst" ? POINTS.burst : KINDS[event.body.kind].points, reason, event.at));
        this.combos.add(event.seat, event.at);
      } else if (event.type === "hit") {
        events.push(this.add(event.seat, POINTS.hit, "hit", event.at));
      } else if (event.type === "bomb") {
        this.combos.cancel(event.seat);
        this.stuns.set(event.seat, STUN_S);
        events.push({ type: "stun", seat: event.seat, seconds: STUN_S });
        events.push(this.add(event.seat, POINTS.bomb, "bomb", event.at));
      }
    }
    for (const combo of this.combos.step(dt)) events.push(this.add(combo.seat, combo.count * POINTS.comboPerFruit, "combo", combo.at, combo.count));
    for (const [key, entry] of this.flying) {
      if (this.arena.bodies.includes(entry.body)) entry.seen = this.time;
      else if (this.time - entry.seen > period) this.flying.delete(key);
    }
    return events;
  }

  /** What to draw now. */
  frame(): RenderFrame {
    const blades = this.hands.map(({ bot }) => {
      const at = this.blades.get(bot.seat)!.position ?? { x: 0, y: 0 };
      return { seat: bot.seat, x: at.x, y: at.y, blade: bot.blade, color: playerColor(bot.seat), stunned: (this.stuns.get(bot.seat) ?? 0) > 0 };
    });
    return { bodies: this.arena.bodies, blades };
  }

  nameOf(seat: Seat): string {
    return this.script.bots.find((bot) => bot.seat === seat)?.name ?? "";
  }

  /**
   * Where a throw is at a moment. Once thrown it is followed from where
   * it really was last, since a hit knocks big fruit off course. Before
   * it is thrown, its planned flight stands in.
   */
  private locate(fruit: string, at: number): Vec2 {
    const spec = this.byId.get(fruit);
    if (!spec) return { x: 0, y: 0 };
    const round = Math.floor((at - spec.t) / this.script.period);
    const entry = this.flying.get(`${fruit}#${round}`);
    if (entry) {
      const { body } = entry;
      const dt = at - entry.seen;
      return { x: body.x + body.vx * dt, y: body.y + body.vy * dt - 0.5 * GRAVITY * dt * dt };
    }
    return flight(launchOf(spec), at - (round * this.script.period + spec.t));
  }

  private add(seat: Seat, points: number, reason: ScoreReason, at: Vec2, count?: number): MatchEvent {
    const before = this.scores.get(seat) ?? 0;
    const total = Math.max(0, before + points);
    this.scores.set(seat, total);
    return { type: "score", seat, delta: total - before, total, reason, at, ...(count ? { count } : {}) };
  }
}
