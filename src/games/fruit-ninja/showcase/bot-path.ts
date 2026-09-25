import type { Vec2 } from "../engine/geometry";
import type { Bot, Mark, Move } from "./script";

/** Finds where a thrown fruit is, or will be, at a moment. */
export type Locate = (fruit: string, at: number) => Vec2;

interface Stop {
  t: number;
  p: Vec2;
}

/** How much of a slash's speed carries on into the glide after it, and comes before the next. */
const FOLLOW_THROUGH = 0.3;
/** A little slack either side of a slash, so the blade cuts from its first point to its last. */
const CUT_SLACK_S = 0.02;

/**
 * A computer player's hand. Each slash runs a smooth curve through its
 * waypoints, timed so the blade meets its fruit, and the hand glides from
 * one move to the next with a little follow through. It loops with the
 * script's period.
 */
export class BotPath {
  private readonly moves: Move[];

  constructor(
    bot: Bot,
    private readonly period: number,
    private readonly locate: Locate,
  ) {
    // Each move is wrapped into the period by its first point, so a slash across the loop point stays whole.
    this.moves = bot.moves
      .map((move) => {
        const start = move.points[0]!.t;
        const shift = ((start % period) + period) % period - start;
        return { cuts: move.cuts, points: move.points.map((p) => ({ t: p.t + shift, at: p.at })) };
      })
      .sort((a, b) => a.points[0]!.t - b.points[0]!.t);
  }

  /** Where the blade is at `time` seconds since the film began. */
  at(time: number): Vec2 {
    const { move, base, index } = this.find(time);
    if (move) return this.along(move, base, time);
    // Gliding from the move before to the move after, wrapping into the periods either side.
    const n = this.moves.length;
    const prev = this.moves[(index + n) % n]!;
    const next = this.moves[(index + 1) % n]!;
    const prevBase = base + (index < 0 ? -this.period : 0);
    const nextBase = base + (index + 1 >= n ? this.period : 0);
    const a = this.ends(prev, prevBase, "last");
    const b = this.ends(next, nextBase, "first");
    return hermite(a.stop, b.stop, scale(a.v, FOLLOW_THROUGH), scale(b.v, FOLLOW_THROUGH), time);
  }

  /** Whether the hand is in the middle of a slash, and so may cut. */
  cutting(time: number): boolean {
    for (const offset of [-CUT_SLACK_S, 0, CUT_SLACK_S]) {
      const { move } = this.find(time + offset);
      if (move?.cuts) return true;
    }
    return false;
  }

  /** The move under way at `time`, or the index of the last one finished. */
  private find(time: number): { move: Move | null; base: number; index: number } {
    const u = ((time % this.period) + this.period) % this.period;
    const base = time - u;
    let index = -1;
    for (let i = 0; i < this.moves.length; i++) {
      const points = this.moves[i]!.points;
      if (points[0]!.t > u) break;
      index = i;
      if (u <= points[points.length - 1]!.t) return { move: this.moves[i]!, base, index };
    }
    return { move: null, base, index };
  }

  private along(move: Move, base: number, time: number): Vec2 {
    const stops = move.points.map((p) => this.stop(p.at, base + p.t));
    if (stops.length === 1) return stops[0]!.p;
    let i = 0;
    while (i < stops.length - 2 && stops[i + 1]!.t < time) i++;
    return hermite(stops[i]!, stops[i + 1]!, speedAt(stops, i), speedAt(stops, i + 1), time);
  }

  /** A move's first or last stop, with the speed the hand has there. */
  private ends(move: Move, base: number, which: "first" | "last"): { stop: Stop; v: Vec2 } {
    const stops = move.points.map((p) => this.stop(p.at, base + p.t));
    const i = which === "first" ? 0 : stops.length - 1;
    return { stop: stops[i]!, v: speedAt(stops, i) };
  }

  private stop(mark: Mark, t: number): Stop {
    if (!("fruit" in mark)) return { t, p: mark };
    const p = this.locate(mark.fruit, t);
    return { t, p: { x: p.x + (mark.dx ?? 0), y: p.y + (mark.dy ?? 0) } };
  }
}

/** The speed through a stop: the average of the way in and the way out, or the one there is at an end. */
function speedAt(stops: readonly Stop[], i: number): Vec2 {
  const here = stops[i]!;
  const legs: Vec2[] = [];
  for (const j of [i - 1, i + 1]) {
    const other = stops[j];
    if (!other || other.t === here.t) continue;
    legs.push({ x: (other.p.x - here.p.x) / (other.t - here.t), y: (other.p.y - here.p.y) / (other.t - here.t) });
  }
  if (legs.length === 0) return { x: 0, y: 0 };
  return { x: legs.reduce((s, v) => s + v.x, 0) / legs.length, y: legs.reduce((s, v) => s + v.y, 0) / legs.length };
}

function scale(v: Vec2, k: number): Vec2 {
  return { x: v.x * k, y: v.y * k };
}

/** A cubic Hermite curve: through both stops, leaving and arriving at the given speeds. */
function hermite(a: Stop, b: Stop, va: Vec2, vb: Vec2, time: number): Vec2 {
  const h = Math.max(1e-3, b.t - a.t);
  const k = Math.min(1, Math.max(0, (time - a.t) / h));
  const k2 = k * k;
  const k3 = k2 * k;
  const c0 = 2 * k3 - 3 * k2 + 1;
  const c1 = (k3 - 2 * k2 + k) * h;
  const c2 = -2 * k3 + 3 * k2;
  const c3 = (k3 - k2) * h;
  return { x: c0 * a.p.x + c1 * va.x + c2 * b.p.x + c3 * vb.x, y: c0 * a.p.y + c1 * va.y + c2 * b.p.y + c3 * vb.y };
}
