import { copyState, startState, type PlayerEvent, type PlayerState } from "./player";
import { step } from "./physics";
import { History, MAX_REWIND } from "./rewind";
import { STEP } from "./tuning";
import type { Level } from "./types";
import { World } from "./world";

/** In practice, a checkpoint is saved this often while the player is safely on a surface. */
const CHECKPOINT_EVERY = 2;
/** A practice respawn goes back to a checkpoint at least this long before the death, so it is never doomed. */
const CHECKPOINT_MARGIN = 1.2;

interface Checkpoint {
  state: PlayerState;
  time: number;
}

/**
 * One player's go at a level: the avatar, the attempt count, the best
 * percent, and in practice the checkpoints. Time here is level time,
 * seconds since the attempt started from the level's beginning, so the
 * host can hold it in step with the music.
 */
export class Run {
  readonly world: World;
  player: PlayerState;
  attempt = 1;
  /** Best percent this session. */
  best = 0;
  time = 0;
  /** Jumps made this attempt, for the results. */
  jumps = 0;
  /** Level time the finish line was crossed, exact to the step. Null until then. */
  finishTime: number | null = null;
  private checkpoints: Checkpoint[] = [];
  private lastCheckpoint = 0;
  /** Level times of jumps not yet used, oldest first. */
  private pending: number[] = [];
  /** The last moments, for replaying a press that arrived late. */
  private readonly history = new History();
  /** Events from a replay, sent on with the next advance. */
  private carried: PlayerEvent[] = [];

  constructor(
    readonly level: Level,
    readonly practice = false,
  ) {
    this.world = new World(level);
    this.player = startState(level);
  }

  get dead(): boolean {
    return this.player.dead;
  }

  get finished(): boolean {
    return this.player.finished;
  }

  /** How far through the level, 0 to 100. */
  get percent(): number {
    if (this.player.finished) return 100;
    return Math.max(0, Math.min(99, Math.floor((this.player.x / this.level.endX) * 100)));
  }

  /** Practice checkpoints so far, for drawing their diamonds. */
  get checkpointSpots(): { x: number; y: number }[] {
    return this.checkpoints.map((c) => ({ x: c.state.x, y: c.state.y }));
  }

  /**
   * A jump at a level time, or on the next step. Timing each press by
   * when it happened, not when the next frame gets to it, keeps a slow
   * frame from moving a jump. A press a moment in the past replays the
   * last steps with it, so a camera jump counts from when the body rose.
   * Presses while dead are dropped.
   */
  press(at = this.time): void {
    if (this.player.dead || this.player.finished) return;
    // Further back than the history reaches, it counts from as far back as it can.
    if (at < this.time - 1e-9 && this.replay(Math.max(at, this.time - MAX_REWIND))) return;
    this.pending.push(Math.max(at, this.time));
    this.pending.sort((a, b) => a - b);
  }

  /**
   * Steps the run up to a level time. Returns what happened on the way.
   * A stop at death or the finish leaves the clock there.
   */
  advanceTo(time: number, events: PlayerEvent[] = []): PlayerEvent[] {
    events.push(...this.carried);
    this.carried = [];
    this.stepTo(time, events, false);
    // A dead or finished run keeps its clock moving, for the explosion and the finish.
    if (this.player.dead || this.player.finished) this.time = Math.max(this.time, time);
    return events;
  }

  /** Back to the start, or in practice to a safe checkpoint. Returns the level time it resumes from. */
  respawn(): number {
    const deathTime = this.time;
    this.attempt += 1;
    this.jumps = 0;
    this.pending = [];
    this.history.clear();
    this.carried = [];
    const safe = [...this.checkpoints].reverse().find((c) => c.time <= deathTime - CHECKPOINT_MARGIN);
    if (this.practice && safe) {
      this.checkpoints = this.checkpoints.filter((c) => c.time <= safe.time);
      this.player = copyState(safe.state);
      this.time = safe.time;
    } else {
      this.checkpoints = [];
      this.player = startState(this.level);
      this.time = 0;
    }
    this.lastCheckpoint = this.time;
    return this.time;
  }

  private stepTo(time: number, events: PlayerEvent[], replaying: boolean): void {
    while (this.time + STEP <= time + 1e-9 && !this.player.dead && !this.player.finished) {
      const at = this.time;
      const stepEvents: PlayerEvent[] = [];
      this.history.save({ time: at, player: this.player, jumps: this.jumps, checkpoints: this.checkpoints.length, lastCheckpoint: this.lastCheckpoint });
      // A press lands on the first step starting at or after its time, exactly as the level tests replay it.
      const pressed = this.pending.length > 0 && this.pending[0]! <= at + 1e-9;
      if (pressed) this.history.usedAt(this.pending.shift()!);
      step(this.player, this.world, STEP, pressed, stepEvents);
      this.time += STEP;
      for (const event of stepEvents) this.note(event);
      if (this.practice && this.maybeCheckpoint()) stepEvents.push({ type: "checkpoint" });
      for (const event of stepEvents) {
        // A replay goes over steps already heard. Only what changed is sent on.
        if (replaying && this.history.wasHeard(at, event)) continue;
        this.history.heardEvent(at, event);
        events.push(event);
      }
    }
  }

  /** Plays the last steps again with a press at `at`. False if `at` is too far back. */
  private replay(at: number): boolean {
    const back = this.history.rewindTo(at);
    if (!back) return false;
    const now = this.time;
    const { snapshot, presses } = back;
    this.player = snapshot.player;
    this.time = snapshot.time;
    this.jumps = snapshot.jumps;
    this.checkpoints.length = snapshot.checkpoints;
    this.lastCheckpoint = snapshot.lastCheckpoint;
    this.pending = [snapshot.time, ...presses, ...this.pending].sort((a, b) => a - b);
    this.stepTo(now, this.carried, true);
    return true;
  }

  private note(event: PlayerEvent): void {
    if (event.type === "jump" || event.type === "flap" || event.type === "flip" || event.type === "orb") this.jumps += 1;
    if (event.type === "death" || event.type === "finish") this.best = Math.max(this.best, this.percent);
    // The clock runs on past the line for the fanfare, so a race needs the moment itself.
    if (event.type === "finish") this.finishTime = this.time;
  }

  /** Saves a checkpoint if one is due and the player is safely placed. Says if it did. */
  private maybeCheckpoint(): boolean {
    const p = this.player;
    const steady = p.mode === "ufo" ? p.vy > -2 : p.grounded;
    if (!steady || this.time - this.lastCheckpoint < CHECKPOINT_EVERY) return false;
    this.checkpoints.push({ state: copyState(p), time: this.time });
    this.lastCheckpoint = this.time;
    return true;
  }
}
