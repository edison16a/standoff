import type { CameraKit } from "@/games/kit/camera";
import type { HostRoomApi } from "@/platform/games/game-api";
import type { SoundDirector } from "../audio/sound-director";
import type { PlayerEvent } from "../engine/player";
import type { Level } from "../engine/types";
import type { DrawPlayer } from "../render/game-renderer";
import { Controls } from "./controls";
import { playerNames } from "./names";
import { Round } from "./round";
import { RoundAdmin } from "./round-admin";
import { Scoreboard } from "./scoreboard";
import type { SongClock } from "./song-clock";
import { useCubeStore as store } from "./store";

/** How much of the song plays before the first beat of a round. */
const START_LEAD = 1;
/** Results wait this long after the finish, for the fanfare and confetti. */
const RESULTS_DELAY_MS = 3200;

/** What starts a round: the level and who plays it how. */
export interface RoundSetup {
  level: Level;
  players: number;
  practice: boolean;
  /** The camera kit, or null to play with the keyboard. */
  kit: CameraKit | null;
}

/**
 * One round from its first beat to the results: the runs, the jumps
 * coming in, the sounds they make, the score and the admin shortcuts.
 * The session hands it a level and draws what it returns each frame.
 */
export class RoundPlay {
  round: Round | null = null;
  /** Every press this round as level time, for browser tests. */
  readonly presses: { slot: number; at: number }[] = [];
  private readonly board = new Scoreboard();
  private readonly admin = new RoundAdmin();
  private controls: Controls | null = null;
  private resultsTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly room: HostRoomApi,
    private readonly sound: SoundDirector,
    private readonly clock: SongClock,
  ) {}

  begin({ level, players, practice, kit }: RoundSetup): void {
    this.end();
    const round = new Round(level, players, practice, this.clock);
    this.round = round;
    this.board.begin(round, level.id);
    this.admin.begin(round);
    this.sound.setPlayers(players);
    this.controls = new Controls(
      kit,
      players,
      (slot, pageMs) => {
        const at = Math.min(this.clock.songTime(), this.clock.songTimeAt(pageMs));
        round.press(slot, at);
        // Browser tests read back when each jump landed. Development builds only.
        if (process.env.NODE_ENV === "development") this.presses.push({ slot, at: at - (round.seats[slot - 1]?.offset ?? 0) });
      },
      (slot, present) => this.presence(slot, present),
    );
    this.clock.restart(0, START_LEAD);
    this.room.setPlaying(true);
    store.setState({ phase: "play", results: [], winner: null, banner: null, names: playerNames(this.room.players()) });
    // Anyone out of view at the start waits, as if they had stepped out. This needs the play phase set first.
    kit?.getSnapshot().present.forEach((seen, i) => !seen && this.presence(i + 1, false));
  }

  end(): void {
    if (this.resultsTimer) clearTimeout(this.resultsTimer);
    this.resultsTimer = null;
    this.admin.end();
    this.controls?.dispose();
    this.controls = null;
    this.round = null;
    this.room.setPlaying(false);
  }

  /** Two players: end the race now, for when neither can finish. Whoever got further leads the results. */
  endEarly(): void {
    if (store.getState().phase !== "play" || !this.round || this.resultsTimer) return;
    this.sound.sfx.back();
    this.showResults();
  }

  /** Moves the round on to now and says what to draw. `now` is the frame's time in milliseconds. */
  frame(now: number): DrawPlayer[] {
    const round = this.round;
    if (!round) return [];
    const playing = store.getState().phase === "play";
    if (playing) this.admin.tick();
    // Behind the results the runs stand still, so an unfinished player makes no more noise.
    const updates = playing ? round.update() : round.seats.map(() => ({ events: [], restarted: false }));
    updates.forEach(({ events }, i) => this.hear(i + 1, events));
    this.board.update(round, now);
    if (playing && round.over && !this.resultsTimer) this.finish();
    return round.seats.map((seat, i) => ({
      state: seat.run.player,
      events: updates[i]!.events,
      attempt: seat.run.attempt,
      restarted: updates[i]!.restarted,
      checkpoints: round.practice ? seat.run.checkpointSpots : undefined,
    }));
  }

  private presence(slot: number, present: boolean): void {
    const round = this.round;
    if (!round || store.getState().phase !== "play") return;
    round.setAway(slot, !present);
    // One player alone pauses the song too. It starts again from the same beat when they return.
    if (!present && round.solo) this.sound.music.stop(0.2);
  }

  private hear(slot: number, events: readonly PlayerEvent[]): void {
    for (const event of events) {
      this.sound.event(event);
      if (event.type === "death" && this.round?.solo) this.sound.music.stop(0.08);
      // The first finish ends a race too, so the song stops under the fanfare either way.
      if (event.type === "finish") this.sound.music.stop(0.6);
      if (event.type === "death" || event.type === "finish") this.board.ended(slot, (text) => text && this.sound.sfx.newBest());
    }
  }

  private finish(): void {
    this.resultsTimer = setTimeout(() => {
      this.resultsTimer = null;
      if (this.round) this.showResults();
    }, RESULTS_DELAY_MS);
  }

  private showResults(): void {
    // The match is over, so its admin shortcuts go. Rematch lists them again.
    this.admin.end();
    this.board.results();
    this.room.setPlaying(false);
    this.sound.music.play("menu");
    store.setState({ phase: "results" });
  }
}
