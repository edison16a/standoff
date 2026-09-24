import { playerColor } from "@/games/kit/players";
import type { ScreenPoint } from "@/games/kit/aim/aim-math";
import type { BladeId } from "../blades";
import { Arena } from "../engine/arena";
import { Blade } from "../engine/blade";
import type { MatchEvent, Seat } from "../engine/events";
import { Match } from "../engine/match";
import { Rng } from "../engine/rng";
import type { Settings } from "../engine/settings";
import { PRACTICE, Spawner } from "../engine/spawner";
import { HALF_HEIGHT } from "../engine/tuning";
import type { RenderFrame } from "../render/fruit-renderer";
import type { BladeFrame } from "../render/trails";

/** One seat's input this frame. */
export interface SeatInput {
  seat: Seat;
  /** Where the phone points, in screen space, or null when it is not aiming. */
  point: ScreenPoint | null;
  blade: BladeId;
  ready: boolean;
}

/**
 * Runs whatever is in the air: the lobby's practice fruit, or a round.
 * It turns each phone's aim into a blade in world units, decides whose
 * blade is drawn and whose may cut, and hands back the events and the
 * picture for this frame.
 */
export class RoundDriver {
  match: Match | null = null;
  private readonly practice = new Arena();
  private readonly practiceSpawner = new Spawner(new Rng(Date.now() >>> 0), PRACTICE);
  private practiceClock = 0;
  private readonly blades = new Map<Seat, Blade>();
  /**
   * Game time in seconds, built from the same capped steps the fruit moves
   * by. Blades are timed on it too, so a slow frame never looks like a
   * gap in a swipe and a fast flick is measured against the fruit's clock.
   */
  private clock = 0;
  halfWidth = HALF_HEIGHT * (16 / 9);

  start(settings: Settings, seats: readonly Seat[]): void {
    this.match = new Match(settings, seats, (Date.now() ^ (Math.random() * 1e9)) >>> 0, this.halfWidth);
    this.practice.clear();
  }

  /** Back to the lobby, where practice fruit flies again. */
  stop(): void {
    this.match = null;
  }

  /** Ends a round early, for when every player in it has left. */
  finish(): MatchEvent[] {
    return this.match?.finish() ?? [];
  }

  get inRound(): boolean {
    return this.match !== null && this.match.phase !== "over";
  }

  step(dt: number, inputs: readonly SeatInput[]): { events: MatchEvent[]; frame: RenderFrame } {
    this.clock += dt;
    const match = this.match;
    const drawn = inputs.filter((input) => input.point && (!this.inRound || (match?.isActive(input.seat) ?? false)));
    for (const seat of this.blades.keys()) {
      if (!drawn.some((input) => input.seat === seat)) this.blades.delete(seat);
    }
    for (const input of drawn) {
      let blade = this.blades.get(input.seat);
      if (!blade) this.blades.set(input.seat, (blade = new Blade()));
      blade.move({ x: input.point!.x * this.halfWidth, y: input.point!.y * HALF_HEIGHT }, this.clock);
    }

    let events: MatchEvent[];
    if (match) {
      match.arena.halfWidth = this.halfWidth;
      events = match.step(dt, this.blades);
    } else {
      events = this.stepPractice(dt, inputs);
    }
    const bodies = match ? match.arena.bodies : this.practice.bodies;
    const blades: BladeFrame[] = drawn.map((input) => {
      const at = this.blades.get(input.seat)!.position ?? { x: 0, y: 0 };
      return { seat: input.seat, x: at.x, y: at.y, blade: input.blade, color: playerColor(input.seat), stunned: (match?.stunLeft(input.seat) ?? 0) > 0 };
    });
    return { events, frame: { bodies, blades } };
  }

  /** A few fruit drift up in the lobby so ready players can try their blade. Nothing scores. */
  private stepPractice(dt: number, inputs: readonly SeatInput[]): MatchEvent[] {
    this.practiceClock += dt;
    this.practice.halfWidth = this.halfWidth;
    const events: MatchEvent[] = [];
    const ctx = { halfWidth: this.halfWidth, elapsed: this.practiceClock, remaining: Number.POSITIVE_INFINITY, players: 1, bodies: this.practice.bodies };
    for (const launch of this.practiceSpawner.step(dt, ctx)) events.push({ type: "spawn", body: this.practice.launch(launch) });
    const ready = new Set(inputs.filter((input) => input.ready).map((input) => input.seat));
    events.push(...this.practice.step(dt, this.blades, (seat) => ready.has(seat)));
    return events;
  }
}
