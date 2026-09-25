import { CameraKit } from "@/games/kit/camera";
import type { HostRoomApi } from "@/platform/games/game-api";
import { SoundDirector } from "../audio/sound-director";
import { Autoplay } from "../engine/autoplay";
import type { PlayerEvent } from "../engine/player";
import type { Level } from "../engine/types";
import { LEVELS, levelById } from "../levels";
import type { DrawInput } from "../render/game-renderer";
import { beatPulse } from "../render/pulse";
import { Controls } from "./controls";
import { loadProgress } from "./progress";
import { Round } from "./round";
import { SongClock } from "./song-clock";
import { initialCubeState, useCubeStore as store, type Phase } from "./store";
import { Scoreboard } from "./scoreboard";

/** How much of the song plays before the first beat of a round. */
const START_LEAD = 1;
/** Results wait this long after the finish, for the fanfare and confetti. */
const RESULTS_DELAY_MS = 3200;

/**
 * Cube Game on the computer, for one room. It owns the camera kit, walks
 * the players from the level select through calibration into a round,
 * keeps every run on the music, and tells the canvas what to draw.
 */
export class CubeSession {
  readonly sound: SoundDirector;
  kit: CameraKit | null = null;
  round: Round | null = null;
  private readonly clock: SongClock;
  private readonly board = new Scoreboard();
  private controls: Controls | null = null;
  private demo: Autoplay;
  private demoRestarted = true;
  private lastFrame = 0;
  private resultsTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly room: HostRoomApi) {
    this.sound = new SoundDirector(room.audio);
    this.clock = new SongClock(this.sound, () => this.songFor());
    store.setState({ ...initialCubeState(), progress: loadProgress() });
    this.demo = new Autoplay(levelById(store.getState().levelId));
    this.clock.restart(0, 0.3);
    if (process.env.NODE_ENV === "development") Object.assign(window, { __cubeGame: this });
  }

  get phase(): Phase {
    return store.getState().phase;
  }

  get level(): Level {
    return this.round?.level ?? this.demo.level;
  }

  /** Menu: pick a level. Its song and a computer run of it play behind the menu. */
  chooseLevel(id: string): void {
    const index = LEVELS.findIndex((l) => l.info.id === id);
    if (index < 0 || index >= store.getState().progress.unlocked || id === store.getState().levelId) return;
    this.sound.sfx.select();
    store.setState({ levelId: id });
    this.demo = new Autoplay(levelById(id));
    this.demoRestarted = true;
    this.clock.restart(0, 0.3);
  }

  setPlayers(players: 1 | 2): void {
    this.sound.sfx.select();
    store.setState({ players });
  }

  setPractice(practice: boolean): void {
    this.sound.sfx.select();
    store.setState({ practice });
  }

  /** Play: the camera first, or straight in with the keyboard. */
  start(input: "camera" | "keys"): void {
    this.sound.sfx.start();
    store.setState({ input });
    if (input === "keys") return this.beginRound();
    const { players } = store.getState();
    if (!this.kit || this.kit.players !== players) {
      this.kit?.dispose();
      // Jumps are read a touch sooner than the kit's default, since the beat does not wait.
      this.kit = new CameraKit({ players, moves: { jump: { rise: 0.15, speed: 1.2 } } });
    }
    this.sound.music.play("menu");
    store.setState({ phase: "camera" });
  }

  cameraReady(): void {
    if (this.phase === "camera") store.setState({ phase: "calibrate" });
  }

  calibrated(): void {
    if (this.phase === "calibrate") this.beginRound();
  }

  /** Back to the level select from anywhere. */
  toMenu(): void {
    this.endRound();
    this.sound.sfx.back();
    store.setState({ phase: "menu", hud: [], banner: null, unlockedNow: null });
    this.demoRestarted = true;
    this.demo.restart();
    this.clock.restart(0, 0.3);
  }

  retry(): void {
    this.beginRound();
  }

  /** From the results: on to the next level, if it is open. */
  next(): void {
    const index = LEVELS.findIndex((l) => l.info.id === store.getState().levelId);
    const next = LEVELS[index + 1];
    if (!next || index + 1 >= store.getState().progress.unlocked) return this.toMenu();
    store.setState({ levelId: next.info.id });
    this.demo = new Autoplay(levelById(next.info.id));
    this.beginRound();
  }

  /** Test hook: a jump for a player at an exact song time, now or ahead. Development builds only. */
  pressAt(slot: number, songTime: number): boolean {
    return process.env.NODE_ENV === "development" && !!this.round?.press(slot, songTime);
  }

  /** What to draw this frame. Called by the canvas on every animation frame. */
  frame(now: number): DrawInput {
    const dt = this.lastFrame ? Math.min(0.1, (now - this.lastFrame) / 1000) : 0;
    this.lastFrame = now;
    const time = this.clock.songTime();
    const pulse = beatPulse(time, this.level.bpm);
    if (this.round && (this.phase === "play" || this.phase === "results")) {
      const round = this.round;
      const updates = round.update();
      updates.forEach(({ events }, i) => this.hear(i + 1, events));
      this.board.update(round, now);
      if (this.phase === "play" && round.over && !this.resultsTimer) this.finishRound();
      const players = round.seats.map((seat, i) => ({ state: seat.run.player, events: updates[i]!.events, attempt: seat.run.attempt, restarted: updates[i]!.restarted }));
      return { time, dt, pulse, players, views: players.map((_, i) => i) };
    }
    const events = this.demo.advanceTo(time);
    if (this.demo.run.finished && time > this.demo.run.time + 1.5) {
      this.demo.restart();
      this.demoRestarted = true;
      this.clock.restart(0, 0.3);
    }
    const restarted = this.demoRestarted;
    this.demoRestarted = false;
    return { time, dt, pulse, players: [{ state: this.demo.run.player, events, attempt: 1, restarted }], views: [0] };
  }

  dispose(): void {
    this.endRound();
    this.kit?.dispose();
    this.sound.dispose();
    this.room.setPlaying(false);
    if (process.env.NODE_ENV === "development") Object.assign(window, { __cubeGame: undefined });
  }

  private songFor(): { id: string; bpm: number } {
    return { id: this.level.theme, bpm: this.level.bpm };
  }

  private beginRound(): void {
    this.endRound();
    const { levelId, players, practice, input } = store.getState();
    const level = levelById(levelId);
    const round = new Round(level, players, practice, this.clock);
    this.round = round;
    this.board.begin(round, levelId);
    this.sound.setPlayers(players);
    this.controls = new Controls(
      input === "camera" ? this.kit : null,
      players,
      (slot, pageMs) => round.press(slot, Math.min(this.clock.songTime(), this.clock.songTimeAt(pageMs))),
      (slot, present) => this.presence(slot, present),
    );
    this.clock.restart(0, START_LEAD);
    this.room.setPlaying(true);
    store.setState({ phase: "play", results: [], unlockedNow: null, banner: null });
  }

  private endRound(): void {
    if (this.resultsTimer) clearTimeout(this.resultsTimer);
    this.resultsTimer = null;
    this.controls?.dispose();
    this.controls = null;
    this.round = null;
    this.room.setPlaying(false);
  }

  private presence(slot: number, present: boolean): void {
    const round = this.round;
    if (!round || this.phase !== "play") return;
    round.setAway(slot, !present);
    // One player alone pauses the song too. It starts again from the same beat when they return.
    if (!present && round.solo) this.sound.music.stop(0.2);
  }

  private hear(slot: number, events: readonly PlayerEvent[]): void {
    for (const event of events) {
      this.sound.event(event);
      if (event.type === "death" && this.round?.solo) this.sound.music.stop(0.08);
      if (event.type === "finish" && this.round?.solo) this.sound.music.stop(0.6);
      if (event.type === "death" || event.type === "finish") this.board.ended(slot, (text) => text && this.sound.sfx.newBest());
    }
  }

  private finishRound(): void {
    this.resultsTimer = setTimeout(() => {
      this.resultsTimer = null;
      if (!this.round) return;
      this.board.results();
      this.room.setPlaying(false);
      this.sound.music.play("menu");
      store.setState({ phase: "results" });
    }, RESULTS_DELAY_MS);
  }
}
