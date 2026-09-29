import { CameraKit, SMALL_JUMP, type MoveEvent } from "@/games/kit/camera";
import type { HostRoomApi } from "@/platform/games/game-api";
import { SoundDirector } from "../audio/sound-director";
import type { RunEvent } from "../engine/events";
import type { Run } from "../engine/run";
import { ShowRun } from "../showcase/show-run";
import { Autopilot } from "./autopilot";
import { Controls } from "./controls";
import { Countdown } from "./countdown";
import { recordResult } from "./results";
import { Round } from "./round";
import { RunBoard } from "./run-board";
import { RunWatch } from "./run-watch";
import { initialSurfState, shownName, useSurfStore as store, type Phase } from "./store";
import { Timers } from "./timers";

const HUD_MS = 80;
const COUNT_S = 3;

/** What the canvas draws: the run, and how the runner should stand when nothing is running. */
export interface Lane3D {
  run: Run;
  mood: "run" | "idle" | "cheer";
}

/**
 * Subway Runner on the computer, for one room. It owns the camera kit,
 * walks the player through setup, runs the rounds and directs the
 * sound. The canvas asks it every frame what to draw. In keyboard mode
 * there is no camera: Start goes straight to the countdown.
 */
export class SurfSession {
  readonly sound: SoundDirector;
  kit: CameraKit | null = null;
  round: Round | null = null;
  private controls: Controls | null = null;
  /** The test bot playing the player's runs, from the console in development. */
  private pilot: Autopilot | null = null;
  // A computer runner plays behind the menus. A short warmup keeps opening the room quick.
  private demo = new ShowRun(3, 6);
  private readonly board: RunBoard;
  private readonly listeners = new Set<(event: RunEvent) => void>();
  private unlistenRound: () => void = () => undefined;
  private unlistenMoves: () => void = () => undefined;
  /** Once the tutorial is done or skipped, later runs go straight to the countdown. */
  private tutorialDone = false;
  private readonly timers = new Timers();
  private readonly watch: RunWatch;
  private countdown = new Countdown(0);
  private resultsAt = 0;
  private last = 0;
  private lastHud = 0;

  constructor(private readonly room: HostRoomApi) {
    this.sound = new SoundDirector(room.audio);
    this.watch = new RunWatch(this.sound);
    store.setState(initialSurfState());
    this.board = new RunBoard((board) => store.setState({ board }));
    this.sound.play("menu");
    if (process.env.NODE_ENV === "development") Object.assign(window, { __subwaySurfers: this });
  }

  get phase(): Phase {
    return store.getState().phase;
  }

  /** Run events for the canvas's sparks, from whichever round is on. */
  listen(listener: (event: RunEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** From the lobby: open the camera, or go straight to the countdown with the keyboard. */
  start(): void {
    if (store.getState().input === "keyboard") return this.playWithKeys();
    // A small hop jumps, so the runner reacts as soon as the player does.
    this.kit ??= new CameraKit({ players: 1, moves: SMALL_JUMP });
    this.useControls(this.kit);
    store.setState({ phase: "camera" });
  }

  /** Keyboard mode: the arrow keys or WASD, with no camera. Also the way out when the camera will not start. */
  playWithKeys(): void {
    store.setState({ input: "keyboard" });
    this.dropKit();
    this.useControls(null);
    this.beginRound();
  }

  /** Development: hands the player's runs to the test bot, or takes them back. */
  autopilot(on = true, flair = false): void {
    this.pilot = on ? new Autopilot(flair) : null;
  }

  /** The camera and the model are ready. */
  cameraReady(): void {
    if (this.phase === "camera") store.setState({ phase: "calibrate" });
  }

  calibrated(): void {
    if (this.phase !== "calibrate") return;
    if (this.tutorialDone) this.beginRound();
    else this.beginTutorial();
  }

  recalibrate(): void {
    // Played with the keys there is no camera to calibrate, so this is the way back to the menu.
    if (!this.kit) return this.toLobby();
    this.room.setPlaying(false);
    this.round = null;
    // Straight from the results the music has not come back yet, and calibrating in silence feels broken.
    this.sound.play("menu");
    store.setState({ phase: "calibrate", countdown: null });
  }

  skipTutorial(): void {
    this.tutorialDone = true;
    this.beginRound();
  }

  toLobby(): void {
    this.room.setPlaying(false);
    this.round = null;
    // The camera goes off while nobody is playing. It starts again from the cache.
    this.dropKit();
    this.sound.play("menu");
    store.setState({ phase: "lobby", countdown: null, hud: null });
  }

  playAgain(): void {
    this.beginRound();
  }

  /** What to draw: the player's run, or the computer's demo run behind the menus. */
  view(): Lane3D {
    const phase = this.phase;
    if (!this.round || phase === "lobby" || phase === "camera" || phase === "calibrate") return { run: this.demo.run, mood: "run" };
    // A new best is worth a cheer at the results.
    const cheer = phase === "results" && !!store.getState().result?.best;
    return { run: this.round.run, mood: phase === "countdown" || this.round.paused ? "idle" : cheer ? "cheer" : "run" };
  }

  tick(now: number): void {
    const wall = this.last ? Math.min(1, (now - this.last) / 1000) : 0;
    const dt = Math.min(0.1, wall);
    this.last = now;
    const phase = this.phase;
    if (!this.round || phase === "lobby" || phase === "camera" || phase === "calibrate") {
      this.demo.advance(dt);
      if (this.demo.run.crashed) this.demo = new ShowRun(this.demo.run.seed + 1, 6);
    } else if (phase === "countdown") {
      // The countdown keeps to the wall clock even when frames are slow.
      this.tickCountdown(wall);
    } else if (phase === "tutorial" || phase === "running" || phase === "results") {
      const round = this.round;
      round.update(dt, this.pilot ? this.pilot.drive(round) : (this.controls?.take() ?? null));
      this.sound.frame([round.run], [round.paused]);
      this.watch.update(this.kit, round, phase === "running");
      if (phase === "tutorial" && round.tutorial.finished) {
        this.tutorialDone = true;
        this.beginRound();
      }
      if (phase === "running" && round.over) this.finish();
      if (phase === "results" && !store.getState().jumpToReplay && now - this.resultsAt > 3500) store.setState({ jumpToReplay: true });
    }
    if (now - this.lastHud > HUD_MS && this.round) {
      this.lastHud = now;
      store.setState({ hud: this.round.hud(this.name()) });
    }
  }

  dispose(): void {
    this.timers.clear();
    this.board.dispose();
    this.unlistenRound();
    this.dropKit();
    this.controls?.dispose();
    this.sound.stop();
    this.room.setPlaying(false);
    if (process.env.NODE_ENV === "development") Object.assign(window, { __subwaySurfers: undefined });
  }

  name(): string {
    return shownName(store.getState().name);
  }

  private beginTutorial(): void {
    this.setRound(new Round(1, { practice: true }));
    this.sound.play("menu");
    store.setState({ phase: "tutorial", countdown: null });
  }

  private beginRound(): void {
    this.setRound(new Round(Math.floor(Math.random() * 1e9), { difficulty: store.getState().difficulty }));
    this.countdown = new Countdown(COUNT_S);
    this.sound.play(null);
    this.sound.count(COUNT_S);
    store.setState({ phase: "countdown", countdown: COUNT_S, result: null, jumpToReplay: false });
  }

  private setRound(round: Round): void {
    this.unlistenRound();
    this.round = round;
    this.sound.setPlayers(1);
    this.unlistenRound = round.listen((event) => {
      this.sound.event(1, event);
      for (const listener of this.listeners) listener(event);
    });
    store.setState({ hud: round.hud(this.name()) });
  }

  private tickCountdown(dt: number): void {
    const count = this.countdown.tick(dt);
    if (count === null) return;
    this.sound.count(count);
    if (count > 0) {
      store.setState({ countdown: count });
      return;
    }
    this.sound.sfx.whistle(0);
    this.sound.play("run");
    this.controls?.reset();
    this.room.setPlaying(true);
    // Out of view at GO waits, like stepping away mid run.
    if (this.kit && !this.kit.getSnapshot().present[0]) this.round?.setAway(true);
    store.setState({ phase: "running", countdown: 0 });
    this.timers.later(700, () => store.getState().countdown === 0 && store.setState({ countdown: null }));
  }

  private finish(): void {
    const { name, input } = store.getState();
    // Saving the run tells the board to reload, so the list comes back with this run in it.
    const result = recordResult(this.round!, name, input);
    this.room.setPlaying(false);
    this.sound.play(null);
    this.sound.celebrate(result.best);
    this.resultsAt = performance.now();
    store.setState({ phase: "results", result, jumpToReplay: false });
    this.timers.later(3000, () => this.phase === "results" && this.sound.play("menu"));
  }

  private onMove(event: MoveEvent): void {
    const round = this.round;
    const phase = this.phase;
    if (!round) return;
    if (phase === "running" && !this.watch.cameraTrouble && (event.type === "away" || event.type === "back")) {
      round.setAway(event.type === "away");
      if (event.type === "away") this.sound.sfx.pause();
    }
    if (phase === "tutorial" && round.tutorialMove(event)) this.sound.sfx.tick(0);
    if (phase === "results" && event.type === "jump" && store.getState().jumpToReplay) this.playAgain();
  }

  private useControls(kit: CameraKit | null): void {
    this.unlistenMoves();
    this.controls?.dispose();
    this.controls = new Controls(kit);
    this.unlistenMoves = this.controls.listen((event) => this.onMove(event));
  }

  private dropKit(): void {
    this.kit?.dispose();
    this.kit = null;
  }
}
