import { CameraKit, type MoveEvent } from "@/games/kit/camera";
import type { HostRoomApi } from "@/platform/games/game-api";
import { SoundDirector } from "../audio/sound-director";
import type { RunEvent } from "../engine/events";
import type { Run } from "../engine/run";
import { ShowRun } from "../showcase/show-run";
import { Controls } from "./controls";
import { Countdown } from "./countdown";
import { recordResults } from "./results";
import { Round } from "./round";
import { initialSurfState, shownNames, useSurfStore as store, type Phase } from "./store";
import { BestStore } from "./best-store";

const HUD_MS = 80;
const COUNT_S = 3;

/** What the canvas draws for one player: their run, and how the runner should stand when nothing is running. */
export interface Lane3D {
  run: Run;
  mood: "run" | "idle" | "cheer";
}

/**
 * Subway Surfers on the computer, for one room. It owns the camera kit,
 * walks the players through setup, runs the rounds and directs the
 * sound. The canvas asks it every frame what to draw.
 */
export class SurfSession {
  readonly sound: SoundDirector;
  kit: CameraKit | null = null;
  round: Round | null = null;
  private controls: Controls | null = null;
  private demo = new ShowRun(3, 20);
  private readonly best = new BestStore();
  private readonly listeners = new Set<(slot: number, event: RunEvent) => void>();
  private unlistenRound: () => void = () => undefined;
  private unlistenMoves: () => void = () => undefined;
  private tutorialSeen = false;
  private countdown = new Countdown(0);
  private resultsAt = 0;
  private last = 0;
  private lastHud = 0;

  constructor(private readonly room: HostRoomApi) {
    this.sound = new SoundDirector(room.audio);
    store.setState({ ...initialSurfState(), best: this.best.current });
    this.sound.play("menu");
    if (process.env.NODE_ENV === "development") Object.assign(window, { __subwaySurfers: this });
  }

  get phase(): Phase {
    return store.getState().phase;
  }

  /** Run events for the canvas's sparks, from whichever round is on. */
  listen(listener: (slot: number, event: RunEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** From the lobby: open the camera for this many players. */
  start(): void {
    const { players } = store.getState();
    if (!this.kit || this.kit.players !== players) {
      this.dropKit();
      this.kit = new CameraKit({ players });
      this.tutorialSeen = false;
    }
    this.useControls(this.kit);
    store.setState({ phase: "camera" });
  }

  /** Without a camera: the arrow keys and WASD, for trying it out. */
  playWithKeys(): void {
    this.dropKit();
    this.useControls(null);
    this.tutorialSeen = true;
    this.beginRound();
  }

  /** The camera and the model are ready. */
  cameraReady(): void {
    if (this.phase === "camera") store.setState({ phase: "calibrate" });
  }

  calibrated(): void {
    if (this.phase !== "calibrate") return;
    if (this.tutorialSeen) this.beginRound();
    else this.beginTutorial();
  }

  recalibrate(): void {
    this.room.setPlaying(false);
    this.round = null;
    store.setState({ phase: this.kit ? "calibrate" : "lobby" });
  }

  skipTutorial(): void {
    this.tutorialSeen = true;
    this.beginRound();
  }

  toLobby(): void {
    this.room.setPlaying(false);
    this.round = null;
    this.sound.play("menu");
    store.setState({ phase: "lobby", countdown: null, hud: [] });
  }

  playAgain(): void {
    this.beginRound();
  }

  /** What to draw: the players' runs, or the computer's demo run behind the menus. */
  views(): Lane3D[] {
    const phase = this.phase;
    if (!this.round || phase === "lobby" || phase === "camera" || phase === "calibrate") return [{ run: this.demo.run, mood: "run" }];
    const winner = store.getState().winner;
    return this.round.seats.map((seat, i) => ({
      run: seat.run,
      mood: phase === "countdown" ? "idle" : phase === "results" && winner === i + 1 ? "cheer" : "run",
    }));
  }

  tick(now: number): void {
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
    this.last = now;
    const phase = this.phase;
    if (!this.round || phase === "lobby" || phase === "camera" || phase === "calibrate") {
      this.demo.advance(dt);
      if (this.demo.run.crashed) this.demo = new ShowRun(this.demo.run.seed + 1, 20);
    } else if (phase === "countdown") {
      this.tickCountdown(dt);
    } else if (phase === "tutorial" || phase === "running" || phase === "results") {
      const round = this.round;
      round.update(dt, round.seats.map((_, i) => this.controls!.take(i + 1)));
      this.sound.frame(round.runs, round.seats.map((_, i) => round.paused(i + 1)));
      if (phase === "tutorial" && round.seats.every((seat) => seat.tutorial.finished)) {
        this.tutorialSeen = true;
        this.beginRound();
      }
      if (phase === "running" && round.over) this.finish();
      if (phase === "results" && !store.getState().jumpToReplay && now - this.resultsAt > 3500) store.setState({ jumpToReplay: true });
    }
    if (now - this.lastHud > HUD_MS && this.round) {
      this.lastHud = now;
      store.setState({ hud: this.round.hud(this.names()) });
    }
  }

  dispose(): void {
    this.unlistenRound();
    this.dropKit();
    this.controls?.dispose();
    this.sound.stop();
    this.room.setPlaying(false);
    if (process.env.NODE_ENV === "development") Object.assign(window, { __subwaySurfers: undefined });
  }

  names(): string[] {
    return shownNames(store.getState());
  }

  private beginTutorial(): void {
    this.setRound(new Round(store.getState().players, 1, true));
    this.sound.play("menu");
    store.setState({ phase: "tutorial", countdown: null });
  }

  private beginRound(): void {
    this.setRound(new Round(this.kit?.players ?? store.getState().players, Math.floor(Math.random() * 1e9)));
    this.countdown = new Countdown(COUNT_S);
    this.sound.play(null);
    this.sound.sfx.countdown(false);
    store.setState({ phase: "countdown", countdown: COUNT_S, results: [], winner: null, jumpToReplay: false });
  }

  private setRound(round: Round): void {
    this.unlistenRound();
    this.round = round;
    this.sound.setPlayers(round.seats.length);
    this.unlistenRound = round.listen((slot, event) => {
      this.sound.event(slot, event);
      for (const listener of this.listeners) listener(slot, event);
    });
    store.setState({ hud: round.hud(this.names()) });
  }

  private tickCountdown(dt: number): void {
    const count = this.countdown.tick(dt);
    if (count === null) return;
    this.sound.sfx.countdown(count === 0);
    if (count > 0) {
      store.setState({ countdown: count });
      return;
    }
    this.sound.sfx.whistle(0);
    this.sound.play("run");
    this.controls?.reset();
    this.room.setPlaying(true);
    // Anyone out of view at GO waits, like a player who steps away mid run.
    this.kit?.getSnapshot().present.forEach((seen, i) => !seen && this.round?.setAway(i + 1, true));
    store.setState({ phase: "running", countdown: 0 });
    setTimeout(() => store.getState().countdown === 0 && store.setState({ countdown: null }), 700);
  }

  private finish(): void {
    const { rows, winner } = recordResults(this.round!, store.getState().names, this.best);
    this.room.setPlaying(false);
    this.sound.play(null);
    this.sound.fanfare();
    this.resultsAt = performance.now();
    store.setState({ phase: "results", results: rows, winner, best: this.best.current, jumpToReplay: false });
    setTimeout(() => this.phase === "results" && this.sound.play("menu"), 3000);
  }

  private onMove(event: MoveEvent): void {
    const round = this.round;
    const phase = this.phase;
    if (!round) return;
    if (phase === "running" && (event.type === "away" || event.type === "back")) {
      round.setAway(event.slot, event.type === "away");
      if (event.type === "away") this.sound.sfx.pause();
    }
    if (phase === "tutorial" && round.tutorialMove(event)) this.sound.sfx.tick(this.sound.panFor(event.slot));
    if (phase === "results" && event.type === "jump" && store.getState().jumpToReplay) this.playAgain();
  }

  private useControls(kit: CameraKit | null): void {
    this.unlistenMoves();
    this.controls?.dispose();
    this.controls = new Controls(kit, kit?.players ?? store.getState().players);
    this.unlistenMoves = this.controls.listen((event) => this.onMove(event));
  }

  private dropKit(): void {
    this.kit?.dispose();
    this.kit = null;
  }
}
