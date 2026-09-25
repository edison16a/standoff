import type { PlayerEvent } from "../engine/player";
import { Run } from "../engine/run";
import { DEATH_PAUSE } from "../engine/tuning";
import type { Level } from "../engine/types";

/** How the round keeps each run in step with the music. */
export interface SongSync {
  /** Seconds since the song's top, on the clock the music plays to. */
  songTime(): number;
  /**
   * One player only: starts the song again so that level time `levelTime`
   * plays `lead` seconds from now. Every attempt then restarts the music,
   * as in the original.
   */
  restart(levelTime: number, lead: number): void;
}

export type Status = "run" | "dead" | "away" | "done";

interface Seat {
  run: Run;
  status: Status;
  /** Song time at which this run's level time is zero. */
  offset: number;
  deadAt: number;
  restarted: boolean;
}

/** How long a player gets to settle after stepping back into view. */
const RESUME_LEAD = 1.5;

/**
 * One go at a level for one or two players. Each has their own run of
 * the same level. With one player the song restarts with every attempt.
 * With two, the song plays on and a player who crashes comes back on the
 * next beat, so the obstacles always land on the music.
 */
export class Round {
  readonly seats: Seat[];
  private readonly spb: number;

  constructor(
    readonly level: Level,
    players: number,
    readonly practice: boolean,
    private readonly sync: SongSync,
  ) {
    this.spb = 60 / level.bpm;
    this.seats = Array.from({ length: players }, () => ({ run: new Run(level, practice), status: "run" as Status, offset: 0, deadAt: 0, restarted: true }));
  }

  get solo(): boolean {
    return this.seats.length === 1;
  }

  get over(): boolean {
    return this.seats.every((seat) => seat.status === "done");
  }

  status(slot: number): Status {
    return this.seats[slot - 1]?.status ?? "done";
  }

  run(slot: number): Run | null {
    return this.seats[slot - 1]?.run ?? null;
  }

  /** Level time of a player's run now, which may be ahead of their avatar while they wait to start. */
  levelTime(slot: number): number {
    const seat = this.seats[slot - 1];
    return seat ? this.sync.songTime() - seat.offset : 0;
  }

  /**
   * A jump for a player, at a song time (now if left out). Ignored while
   * they wait for their start, crash or step away.
   */
  press(slot: number, songTime = this.sync.songTime()): boolean {
    const seat = this.seats[slot - 1];
    const at = songTime - (seat?.offset ?? 0);
    if (!seat || seat.status !== "run" || at < seat.run.time - 0.02) return false;
    seat.run.press(at);
    return true;
  }

  /** A player left the camera's view, or came back. */
  setAway(slot: number, away: boolean): void {
    const seat = this.seats[slot - 1];
    if (!seat) return;
    if (away && seat.status === "run") seat.status = "away";
    else if (!away && seat.status === "away") {
      seat.status = "run";
      this.startFrom(seat, seat.run.time, RESUME_LEAD);
    }
  }

  /** Moves every run up to now. Returns what happened, per player. */
  update(): { events: PlayerEvent[]; restarted: boolean }[] {
    const now = this.sync.songTime();
    return this.seats.map((seat) => {
      const events: PlayerEvent[] = [];
      if (seat.status === "run") {
        seat.run.advanceTo(now - seat.offset, events);
        if (seat.run.dead) {
          seat.status = "dead";
          seat.deadAt = now;
        } else if (seat.run.finished) seat.status = "done";
      } else if (seat.status === "dead" && now - seat.deadAt >= DEATH_PAUSE) {
        seat.status = "run";
        this.startFrom(seat, seat.run.respawn(), 0.05);
      }
      const restarted = seat.restarted;
      seat.restarted = false;
      return { events, restarted };
    });
  }

  /** Sets a seat to play from level time `from`, at least `lead` seconds from now, on the beat. */
  private startFrom(seat: Seat, from: number, lead: number): void {
    seat.restarted = true;
    if (this.solo) {
      this.sync.restart(from, lead);
      seat.offset = 0;
      return;
    }
    const earliest = this.sync.songTime() + lead - from;
    // Whole beats only, so the level's beats stay on the song's.
    seat.offset = Math.ceil(earliest / this.spb - 1e-9) * this.spb;
  }
}
