import { CameraKit } from "@/games/kit/camera";
import type { HostRoomApi } from "@/platform/games/game-api";
import { SoundDirector } from "../audio/sound-director";
import type { Level } from "../engine/types";
import { LEVELS, levelById } from "../levels";
import type { DrawInput } from "../render/game-renderer";
import { beatPulse } from "../render/pulse";
import { loadBoard, syncBoard } from "./board-sync";
import { JUMP_SMOOTHING, JUMP_TUNING } from "./jump-tuning";
import { listenKeyboardSeat } from "./key-messages";
import { MenuDemo } from "./menu-demo";
import { loadProgress } from "./progress";
import type { Round } from "./round";
import { RoundPlay } from "./round-play";
import { SongClock } from "./song-clock";
import { initialCubeState, useCubeStore as store, type Phase } from "./store";

/**
 * Cube Game on the computer, for one room. It owns the camera kit and
 * the song's clock, walks the players from the level select through
 * calibration into a round, which `RoundPlay` runs, and tells the canvas
 * what to draw.
 */
export class CubeSession {
  readonly sound: SoundDirector;
  kit: CameraKit | null = null;
  private readonly clock: SongClock;
  private readonly play: RoundPlay;
  private readonly demo: MenuDemo;
  private lastFrame = 0;
  private readonly stopBoard: () => void;
  private readonly stopSeat: () => void;

  constructor(private readonly room: HostRoomApi) {
    this.sound = new SoundDirector(room.audio);
    this.clock = new SongClock(this.sound, () => this.songFor());
    this.play = new RoundPlay(room, this.sound, this.clock);
    store.setState({ ...initialCubeState(), progress: loadProgress() });
    this.demo = new MenuDemo(store.getState().levelId);
    this.stopBoard = syncBoard();
    // The admin panel's Keyboard player jumps like the keys on this computer.
    this.stopSeat = listenKeyboardSeat(room, (player, at) => this.play.keyJump(player, at));
    this.clock.restart(0, 0.3);
    if (process.env.NODE_ENV === "development") Object.assign(window, { __cubeGame: this });
  }

  get phase(): Phase {
    return store.getState().phase;
  }

  /** The round being played, or behind the results. */
  get round(): Round | null {
    return this.play.round;
  }

  /** Every press this round as level time, for browser tests. */
  get presses(): readonly { slot: number; at: number }[] {
    return this.play.presses;
  }

  get level(): Level {
    return this.round?.level ?? this.demo.level;
  }

  /** Menu: pick a level. Its song and a computer run of it play behind the menu. */
  chooseLevel(id: string): void {
    const index = LEVELS.findIndex((l) => l.info.id === id);
    if (index < 0 || id === store.getState().levelId) return;
    this.sound.sfx.select();
    store.setState({ levelId: id });
    loadBoard(id);
    this.demo.load(id);
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
      this.kit = new CameraKit({ players, moves: JUMP_TUNING, smoothing: JUMP_SMOOTHING });
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
    this.play.end();
    this.sound.sfx.back();
    store.setState({ phase: "menu", hud: [], banner: null });
    this.demo.restart();
    this.clock.restart(0, 0.3);
  }

  retry(): void {
    this.beginRound();
  }

  /** Two players: end the race now, for when neither can finish. Whoever got further leads the results. */
  endEarly(): void {
    this.play.endEarly();
  }

  /** From the results: on to the next level, or back to the menu after the last. */
  next(): void {
    const index = LEVELS.findIndex((l) => l.info.id === store.getState().levelId);
    const next = LEVELS[index + 1];
    if (!next) return this.toMenu();
    store.setState({ levelId: next.info.id, placed: [] });
    loadBoard(next.info.id);
    this.demo.load(next.info.id);
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
      const players = this.play.frame(now);
      return { time, dt, pulse, players, views: players.map((_, i) => i) };
    }
    const { player, looped } = this.demo.frame(time);
    // The level's song only plays behind the level select. The camera steps keep the calm menu song.
    if (looped && this.phase === "menu") this.clock.restart(0, 0.3);
    else if (looped) this.clock.hold(0, 0.3);
    return { time, dt, pulse, players: [player], views: [0] };
  }

  dispose(): void {
    this.stopBoard();
    this.stopSeat();
    this.play.end();
    this.kit?.dispose();
    this.sound.dispose();
    this.room.setPlaying(false);
    if (process.env.NODE_ENV === "development") Object.assign(window, { __cubeGame: undefined });
  }

  private songFor(): { id: string; bpm: number } {
    return { id: this.level.theme, bpm: this.level.bpm };
  }

  private beginRound(): void {
    const { levelId, players, practice, input } = store.getState();
    this.play.begin({ level: levelById(levelId), players, practice, kit: input === "camera" ? this.kit : null });
  }
}
