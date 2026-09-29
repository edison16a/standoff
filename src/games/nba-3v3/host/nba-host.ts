import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import { HostPad } from "@/games/kit/pad/host-pad";
import type { HostRoomApi } from "@/platform/games/game-api";
import { SoundDirector } from "../audio/sound-director";
import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";
import type { TeamId } from "../engine/types";
import type { V2 } from "../engine/vec";
import type { Phase } from "../protocol";
import { registerTestActions } from "./admin";
import { Buzzer } from "./buzzer";
import { DemoGame } from "./demo";
import { EventFanout } from "./event-fanout";
import { useNbaStore as store } from "./host-store";
import { Lobby } from "./lobby";
import { MatchDriver } from "./match-driver";
import { PhoneLink } from "./phone-link";
import { nameFor, phaseOf, publish } from "./publish";
import type { ReplayCamera } from "./replay-camera";
import { RoomInput } from "./room-input";

/** The overlay and the phones are refreshed this often; the canvas every frame. */
const HUD_MS = 100;

/**
 * Basketball 3v3 on the computer, for one room. It keeps the lobby and the
 * teams, runs the game, directs the sound, and it is
 * the referee: phones send their stick and buttons, and everything they
 * show comes back from here.
 */
export class NbaHost {
  readonly lobby = new Lobby();
  driver: MatchDriver | null = null;
  readonly audio: SoundDirector;
  private readonly pad: HostPad;
  private readonly phones: PhoneLink;
  private readonly buzzer: Buzzer;
  private readonly fanout: EventFanout;
  private readonly unsubscribe: () => void;
  private readonly unpress: () => void;
  private unlistenMatch: (() => void) | null = null;
  /** Removes this game's shortcuts from the host's hidden admin panel. */
  private unadmin: (() => void) | null = null;
  private lastHud = 0;
  private lastFrame = 0;
  private lastPhase: Phase = "lobby";
  /** The game is over and the replay is done with, so the join code can show again. */
  private settled = false;
  /** The host asked for the box scores before the ceremony brought them in. */
  private statsNow = false;
  private readonly demo: DemoGame;
  /** Browser tests on slow machines run the game faster than real time. Always 1 in play. */
  turbo = 1;

  constructor(private readonly room: HostRoomApi) {
    this.audio = new SoundDirector(room.audio);
    this.pad = new HostPad(room);
    this.phones = new PhoneLink(room);
    this.buzzer = new Buzzer(this.phones);
    const refresh = () => this.refresh(performance.now());
    this.fanout = new EventFanout({ audio: this.audio, buzzer: this.buzzer, nameOf: (id) => this.nameOf(id), refresh });
    this.demo = new DemoGame((event) => {
      if (!this.driver) this.fanout.demo(event);
    });
    store.setState({ ...store.getInitialState() });
    for (const player of room.players()) if (player.connected) this.lobby.connect(player.seat);
    const input = new RoomInput({ room, lobby: this.lobby, phones: this.phones, driver: () => this.driver, refresh });
    this.unsubscribe = room.on((event) => input.onRoom(event));
    this.unpress = this.pad.onPress((seat, button, down, stick) => input.onPress(seat, button, down, stick));
    this.audio.setPhase("lobby");
    this.refresh(performance.now());
  }

  dispose(): void {
    this.unsubscribe();
    this.unpress();
    this.pad.dispose();
    this.unlistenMatch?.();
    this.unadmin?.();
    this.fanout.dispose();
    this.audio.stop();
    this.room.setPlaying(false);
  }

  get phase(): Phase {
    return phaseOf(this.driver);
  }

  /** The game on screen: the real one (or its replay), or the demo behind the lobby. */
  get match(): Match {
    return this.driver?.view ?? this.demo.match;
  }

  /** From the ceremony: straight to the box scores. */
  showStats(): void {
    this.statsNow = true;
    this.refresh(performance.now());
  }

  /** Where the replay's camera is while it plays, or null for the broadcast camera. */
  replayCamera(): ReplayCamera | null {
    return this.driver?.replays.replay?.camera() ?? null;
  }

  /** Match events for the renderer's effects. */
  listen(listener: (event: MatchEvent) => void): () => void {
    return this.fanout.listen(listener);
  }

  /** The name a player is shown by: their own for people, CPU and the build for computers. */
  nameOf(id: number): string {
    return this.driver ? nameFor(this.driver.match, id, this.room.players()) : "";
  }

  /** Between games: the teams, roles and settings can change. */
  private get between(): boolean {
    const phase = this.phase;
    return phase !== "countdown" && phase !== "live" && phase !== "replay";
  }

  private edit(change: () => void): void {
    if (this.between) change();
    this.refresh(performance.now());
  }

  setTeam(seat: number, team: TeamId): void {
    this.edit(() => this.lobby.setTeam(seat, team));
  }

  shuffle(): void {
    this.edit(() => this.lobby.shuffle());
  }

  /** Computer players on or off, for the next game. */
  setBots(on: boolean): void {
    this.edit(() => this.lobby.setBots(on));
  }

  /** How good the computer players are, for the next game. */
  setLevel(level: BotLevel): void {
    this.edit(() => this.lobby.setLevel(level));
  }

  /** The host gives a player the next role on their team: Guard, Wing or Big. */
  cycleRole(seat: number): void {
    this.edit(() => this.lobby.cycleRole(seat));
  }

  /** Starts a game with the teams as they stand, computers filling the gaps if they are on. */
  start(): void {
    if (!this.between || this.lobby.startBlock()) return;
    this.unlistenMatch?.();
    const driver = new MatchDriver(this.lobby.entries(), undefined, this.lobby.level);
    this.driver = driver;
    this.statsNow = false;
    const unlisten = driver.listen((event) => this.fanout.live(event, driver));
    const unreplay = driver.replays.listen((event, ghost) => this.fanout.replay(event, ghost));
    this.unlistenMatch = () => {
      unlisten();
      unreplay();
    };
    this.unadmin?.();
    this.unadmin = registerTestActions(driver);
    this.room.setPlaying(true);
    this.phones.forget();
    this.refresh(performance.now());
  }

  /** From the results: back to the team picker, keeping everyone's choices. */
  backToLobby(): void {
    this.unadmin?.();
    this.unadmin = null;
    this.unlistenMatch?.();
    this.unlistenMatch = null;
    this.driver = null;
    this.room.setPlaying(false);
    this.refresh(performance.now());
  }

  /** The camera's forward direction on the floor, so the stick moves players the way the screen shows. */
  setView(forward: V2): void {
    this.driver?.setView(forward);
  }

  /** Called every animation frame. Returns the game time that passed, for the animation. */
  tick(nowMs: number): number {
    const realDt = this.lastFrame ? (nowMs - this.lastFrame) / 1000 : 0;
    this.lastFrame = nowMs;
    let dt: number;
    if (this.driver) {
      dt = 0;
      for (let i = 0; i < this.turbo; i++) dt += this.driver.tick(realDt, (seat) => this.pad.stick(seat, nowMs));
      this.audio.frame(this.driver.match);
      this.audio.ceremony(this.driver.ceremony?.t ?? null);
    } else dt = this.demo.tick(realDt);
    const phase = this.phase;
    if (phase !== this.lastPhase) {
      this.lastPhase = phase;
      this.audio.setPhase(phase);
      this.refresh(nowMs);
    }
    // The results are a good moment for someone new to scan in, once the replay has had the screen.
    const settled = phase === "over" && !this.driver?.replays.pending;
    if (settled && !this.settled) this.room.setPlaying(false);
    this.settled = settled;
    if (nowMs - this.lastHud >= HUD_MS) this.refresh(nowMs);
    return dt;
  }

  private refresh(nowMs: number): void {
    this.lastHud = nowMs;
    publish({ nowMs, players: this.room.players(), lobby: this.lobby, driver: this.driver, phones: this.phones, statsNow: this.statsNow });
  }
}
