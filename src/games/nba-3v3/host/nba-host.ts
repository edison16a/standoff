import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import { HostPad } from "@/games/kit/pad/host-pad";
import type { HostRoomApi, HostRoomEvent } from "@/platform/games/game-api";
import { SoundDirector } from "../audio/sound-director";
import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";
import type { TeamId } from "../engine/types";
import { BUTTONS, type Button } from "../engine/types";
import type { V2 } from "../engine/vec";
import { phoneMessageSchema, type Phase, type PhoneMessage } from "../protocol";
import { registerTestActions } from "./admin";
import { BannerBoard, REPLAY_SOUNDS, slowForMoment } from "./banners";
import { Buzzer } from "./buzzer";
import { banner } from "./callouts";
import { DemoGame } from "./demo";
import { useNbaStore as store } from "./host-store";
import { Lobby } from "./lobby";
import { MatchDriver } from "./match-driver";
import { PhoneLink } from "./phone-link";
import { nameFor, phaseOf, publish } from "./publish";
import type { ReplayCamera } from "./replay-camera";

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
  private readonly banners = new BannerBoard();
  private readonly unsubscribe: () => void;
  private readonly unpress: () => void;
  private unlistenMatch: (() => void) | null = null;
  /** Removes this game's shortcuts from the host's hidden admin panel. */
  private unadmin: (() => void) | null = null;
  private readonly matchListeners = new Set<(event: MatchEvent) => void>();
  private lastHud = 0;
  private lastFrame = 0;
  private lastPhase: Phase = "lobby";
  private readonly demo: DemoGame;
  /** Browser tests on slow machines run the game faster than real time. Always 1 in play. */
  turbo = 1;

  constructor(private readonly room: HostRoomApi) {
    this.demo = new DemoGame((event) => {
      if (!this.driver) for (const listener of this.matchListeners) listener(event);
    });
    this.audio = new SoundDirector(room.audio);
    this.pad = new HostPad(room);
    this.phones = new PhoneLink(room);
    this.buzzer = new Buzzer(this.phones);
    store.setState({ ...store.getInitialState() });
    for (const player of room.players()) if (player.connected) this.lobby.connect(player.seat);
    this.unsubscribe = room.on((event) => this.onRoom(event));
    this.unpress = this.pad.onPress((seat, button, down, stick) => this.onPress(seat, button, down, stick));
    this.audio.setPhase("lobby");
    this.refresh(performance.now());
  }

  dispose(): void {
    this.unsubscribe();
    this.unpress();
    this.pad.dispose();
    this.unlistenMatch?.();
    this.unadmin?.();
    this.banners.dispose();
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

  /** Where the replay's camera is while it plays, or null for the broadcast camera. */
  replayCamera(): ReplayCamera | null {
    return this.driver?.replays.replay?.camera() ?? null;
  }

  /** Match events for the renderer's effects. */
  listen(listener: (event: MatchEvent) => void): () => void {
    this.matchListeners.add(listener);
    return () => this.matchListeners.delete(listener);
  }

  /** The name a player is shown by: their own for people, the star's for computers. */
  nameOf(id: number): string {
    return this.driver ? nameFor(this.driver.match, id, this.room.players()) : "";
  }

  private get between(): boolean {
    const phase = this.phase;
    return phase !== "countdown" && phase !== "live" && phase !== "replay";
  }

  setTeam(seat: number, team: TeamId): void {
    if (this.between) this.lobby.setTeam(seat, team);
    this.refresh(performance.now());
  }

  shuffle(): void {
    if (this.between) this.lobby.shuffle();
    this.refresh(performance.now());
  }

  /** Computer players on or off, for the next game. */
  setBots(on: boolean): void {
    if (this.between) this.lobby.setBots(on);
    this.refresh(performance.now());
  }

  /** How good the computer players are, for the next game. */
  setLevel(level: BotLevel): void {
    if (this.between) this.lobby.setLevel(level);
    this.refresh(performance.now());
  }

  /** The host gives a player the next role on their team: Guard, Wing or Big. */
  cycleRole(seat: number): void {
    if (this.between) this.lobby.cycleRole(seat);
    this.refresh(performance.now());
  }

  /** Starts a game with the teams as they stand, computers filling the gaps if they are on. */
  start(): void {
    if (!this.between || this.lobby.startBlock()) return;
    this.unlistenMatch?.();
    const driver = new MatchDriver(this.lobby.entries(), undefined, this.lobby.level);
    this.driver = driver;
    const unlisten = driver.listen((event) => this.onMatchEvent(event));
    const unreplay = driver.replays.listen((event, ghost) => this.onReplayEvent(event, ghost));
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
    } else dt = this.demo.tick(realDt);
    const phase = this.phase;
    if (phase !== this.lastPhase) {
      this.lastPhase = phase;
      this.audio.setPhase(phase);
      // The results are a good moment for someone new to scan in for the next game.
      if (phase === "over") this.room.setPlaying(false);
      this.refresh(nowMs);
    }
    if (nowMs - this.lastHud >= HUD_MS) this.refresh(nowMs);
    return dt;
  }

  private onMatchEvent(event: MatchEvent): void {
    const driver = this.driver;
    if (!driver) return;
    const m = driver.match;
    this.audio.event(event, m);
    for (const listener of this.matchListeners) listener(event);
    this.buzzer.onEvent(event, m, driver.athleteBySeat);
    slowForMoment(event, driver);
    if (event.type === "shot" && event.grade === "perfect" && m.athletes[event.id]?.seat !== null) this.audio.green();
    const shown = banner(event, m, (id) => this.nameOf(id), this.banners.count);
    if (shown) this.banners.show(shown);
    const prompt = ["score", "win", "go", "check", "checkUp", "foul", "andOne", "freeThrow"] as const;
    if ((prompt as readonly string[]).includes(event.type)) this.refresh(performance.now());
  }

  /** The replay replays the ball's and the players' sounds and the effects, and nothing that changes the game. */
  private onReplayEvent(event: MatchEvent, ghost: Match): void {
    if (REPLAY_SOUNDS.has(event.type)) this.audio.event(event, ghost);
    for (const listener of this.matchListeners) listener(event);
  }

  private onPress(seat: number, button: string, down: boolean, stick: { x: number; y: number }): void {
    const driver = this.driver;
    if (!driver || !(BUTTONS as readonly string[]).includes(button)) return;
    if (down) driver.press(seat, button as Button, stick);
    // The phone's own release message usually lands first; this catches one that did not.
    else if (button === "shoot") driver.release(seat);
    if (driver.replays.replay || this.phase === "replay") this.refresh(performance.now());
  }

  private onRoom(event: HostRoomEvent): void {
    switch (event.type) {
      case "joined":
        this.lobby.connect(event.seat);
        this.driver?.setOnline(event.seat, true);
        this.phones.forget(event.seat);
        break;
      case "left":
        this.lobby.disconnect(event.seat);
        this.driver?.setOnline(event.seat, false);
        break;
      case "message": {
        const parsed = phoneMessageSchema.safeParse(event.payload);
        if (parsed.success) this.onPhone(event.seat, parsed.data);
        return;
      }
      case "resync":
        for (const player of this.room.players()) {
          if (player.connected) this.lobby.connect(player.seat);
          else this.lobby.disconnect(player.seat);
          this.driver?.setOnline(player.seat, player.connected);
        }
        this.phones.forget();
        break;
      case "players":
      case "online":
        break;
    }
    this.refresh(performance.now());
  }

  private onPhone(seat: number, message: PhoneMessage): void {
    switch (message.kind) {
      case "release":
        this.driver?.release(seat, message.heldMs);
        return;
      case "skip":
        this.driver?.replays.skip(seat);
        break;
      case "pick":
        this.lobby.pick(seat, message.character);
        break;
      case "ready":
        this.lobby.setReady(seat, message.ready);
        break;
      case "hello":
        this.phones.forget(seat);
        break;
    }
    this.refresh(performance.now());
  }

  private refresh(nowMs: number): void {
    this.lastHud = nowMs;
    publish({ nowMs, players: this.room.players(), lobby: this.lobby, driver: this.driver, phones: this.phones });
  }
}
