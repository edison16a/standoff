import type { Stick } from "@/games/kit/pad/stick-math";
import type { MatchEvent } from "../engine/events";
import { Match, type Entry } from "../engine/match";
import { STEP } from "../engine/tuning";
import type { Button } from "../engine/types";
import type { V2 } from "../engine/vec";

/** A frame longer than this is a stall; the game does not try to catch up past it. */
const MAX_FRAME = 0.25;

/**
 * Runs one game on the host: turns each phone's stick into a direction
 * on the court as the camera sees it, steps the match at a fixed rate,
 * slows time for the big moments, and hands every event to whoever
 * listens (the sound, the effects and the phones).
 */
export class MatchDriver {
  readonly match: Match;
  readonly athleteBySeat = new Map<number, number>();
  private readonly listeners = new Set<(event: MatchEvent) => void>();
  private carry = 0;
  private slowLeft = 0;
  private slowScale = 1;
  /** The camera's forward direction on the floor, so up on the stick is up the screen. */
  private forward: V2 = { x: 0, z: -1 };

  constructor(entries: readonly Entry[], seed?: number) {
    this.match = new Match({ entries, seed });
    entries.forEach((entry, id) => {
      if (entry.seat !== null) this.athleteBySeat.set(entry.seat, id);
    });
  }

  listen(listener: (event: MatchEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setView(forward: V2): void {
    const l = Math.hypot(forward.x, forward.z);
    if (l > 1e-3) this.forward = { x: forward.x / l, z: forward.z / l };
  }

  /** Stick up is away from the camera, stick right is screen right. */
  toCourt(stick: Stick): V2 {
    const f = this.forward;
    return { x: -f.z * stick.x + f.x * stick.y, z: f.x * stick.x + f.z * stick.y };
  }

  /** Slows the game for a moment, like a replay of a big dunk as it happens. */
  slowMo(scale: number, seconds: number): void {
    this.slowScale = scale;
    this.slowLeft = seconds;
  }

  /** Steps the game by a real frame and returns how much game time passed, for the animation. */
  tick(realDt: number, stickOf: (seat: number) => Stick): number {
    const frame = Math.min(MAX_FRAME, Math.max(0, realDt));
    const scale = this.slowLeft > 0 ? this.slowScale : 1;
    this.slowLeft = Math.max(0, this.slowLeft - frame);
    for (const [seat, id] of this.athleteBySeat) {
      if (!this.match.athletes[id]?.auto) this.match.setMove(id, this.toCourt(stickOf(seat)));
    }
    const dt = frame * scale;
    this.carry += dt;
    while (this.carry >= STEP) {
      this.carry -= STEP;
      this.match.step(STEP);
      for (const event of this.match.drainEvents()) for (const listener of this.listeners) listener(event);
    }
    return dt;
  }

  press(seat: number, button: Button, stick: Stick): void {
    const id = this.athleteBySeat.get(seat);
    if (id === undefined || this.match.athletes[id]?.auto) return;
    this.match.press(id, button, this.toCourt(stick));
  }

  release(seat: number, heldMs?: number): void {
    const id = this.athleteBySeat.get(seat);
    if (id !== undefined) this.match.release(id, heldMs);
  }

  /** A phone dropped or came back: the computer plays for them meanwhile. */
  setOnline(seat: number, online: boolean): void {
    const id = this.athleteBySeat.get(seat);
    if (id !== undefined) this.match.setAuto(id, !online);
  }
}
