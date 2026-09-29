import type { PlayerEvent } from "../engine/player";
import { Run } from "../engine/run";
import { DEATH_PAUSE } from "../engine/tuning";
import type { Level } from "../engine/types";
import { racePlaces, raceWinner } from "./race";

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

/** `beaten` is a racer still out on the level when the other crossed the line. */
export type Status = "run" | "dead" | "away" | "done" | "beaten";

interface Seat {
  run: Run;
  status: Status;
  /** Song time at which this run's level time is zero. */
  offset: number;
  deadAt: number;
  restarted: boolean;
  /** Out of the camera's view. Kept apart from the status, since a player can step out while crashed. */
  away: boolean;
  /** Song time this run crossed the finish line, for deciding a race. */
  finishAt: number | null;
}

/** How long a player gets to settle after stepping back into view. */
const RESUME_LEAD = 1.5;

/**
 * One go at a level for one or two players. Each has their own run of
 * the same level. With one player the song restarts with every attempt.
 * Two players race: the song plays on, a player who crashes comes back
 * on the next beat so the obstacles always land on the music, and the
 * first over the line wins.
 */
export class Round {
  readonly seats: Seat[];
  /** The race winner's slot. Null while the race is on, and after a dead heat. */
  winner: number | null = null;
  private decided = false;
  private readonly spb: number;

  constructor(
    readonly level: Level,
    players: number,
    readonly practice: boolean,
    private readonly sync: SongSync,
  ) {
    this.spb = 60 / level.bpm;
    this.seats = Array.from({ length: players }, () => ({ run: new Run(level, practice), status: "run" as Status, offset: 0, deadAt: 0, restarted: true, away: false, finishAt: null }));
  }

  get solo(): boolean {
    return this.seats.length === 1;
  }

  /** Alone, the level is beaten. In a race, someone crossed the line. */
  get over(): boolean {
    return this.solo ? this.seats.every((seat) => seat.status === "done") : this.decided;
  }

  /**
   * Each player's place, 1 for the leader: by where they are now, or with
   * `byBest` by the furthest they got, for a race ended before anyone finished.
   */
  places(byBest = false): number[] {
    const reach = (run: Seat["run"]) => (byBest ? Math.max(run.player.x, (run.best / 100) * this.level.endX) : run.player.x);
    return racePlaces(this.seats.map((seat) => ({ finishAt: seat.finishAt, x: reach(seat.run) })));
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
    // Waiting is judged by now, not by the press's time: a key held up by a slow frame still counts.
    if (!seat || seat.status !== "run" || this.levelTime(slot) < seat.run.time - 0.02) return false;
    seat.run.press(songTime - seat.offset);
    return true;
  }

  /** A player left the camera's view, or came back. */
  setAway(slot: number, away: boolean): void {
    const seat = this.seats[slot - 1];
    if (!seat) return;
    seat.away = away;
    if (away && seat.status === "run") seat.status = "away";
    else if (!away && seat.status === "away") {
      seat.status = "run";
      this.startFrom(seat, seat.run.time, RESUME_LEAD);
    }
  }

  /** Moves every run up to now. Returns what happened, per player. */
  update(): { events: PlayerEvent[]; restarted: boolean }[] {
    const now = this.sync.songTime();
    const updates = this.seats.map((seat) => {
      const events: PlayerEvent[] = [];
      // Once a race is won the runs stand still, so the loser makes no more noise.
      if (this.decided) return { events, restarted: false };
      if (seat.status === "run") {
        seat.run.advanceTo(now - seat.offset, events);
        if (seat.run.dead) {
          seat.status = "dead";
          seat.deadAt = now;
        } else if (seat.run.finished) {
          seat.status = "done";
          seat.finishAt = seat.offset + (seat.run.finishTime ?? seat.run.time);
        }
      } else if (seat.status === "dead" && now - seat.deadAt >= DEATH_PAUSE) {
        const from = seat.run.respawn();
        // Someone who stepped out while crashed waits at the start instead of crashing over and over.
        seat.status = seat.away ? "away" : "run";
        if (!seat.away) this.startFrom(seat, from, 0.05);
        else seat.restarted = true;
      }
      const restarted = seat.restarted;
      seat.restarted = false;
      return { events, restarted };
    });
    if (!this.solo && !this.decided) this.decide();
    return updates;
  }

  /** Both may cross in one frame, so the winner is picked from exact crossing times after every seat moved. */
  private decide(): void {
    const entries = this.seats.map((seat) => ({ finishAt: seat.finishAt, x: seat.run.player.x }));
    if (!entries.some((e) => e.finishAt !== null)) return;
    this.decided = true;
    this.winner = raceWinner(entries);
    for (const seat of this.seats) if (seat.status !== "done") seat.status = "beaten";
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
