import { HostPad } from "@/games/kit/pad/host-pad";
import type { HostRoomApi, HostRoomEvent } from "@/platform/games/game-api";
import { SoundDirector } from "../audio/sound-director";
import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";
import type { TeamId } from "../engine/types";
import { BUTTONS, type Button } from "../engine/types";
import type { V2 } from "../engine/vec";
import { phoneMessageSchema, type Phase, type PhoneMessage } from "../protocol";
import { Buzzer } from "./buzzer";
import { banner, type BannerText } from "./callouts";
import { Commentary } from "./commentary";
import { DemoGame } from "./demo";
import { useNbaStore as store } from "./host-store";
import { Lobby } from "./lobby";
import { MatchDriver } from "./match-driver";
import { PhoneLink } from "./phone-link";
import { nameFor, phaseOf, publish } from "./publish";

/** The overlay and the phones are refreshed this often; the canvas every frame. */
const HUD_MS = 100;
const BANNER_MS = 1900;

/**
 * NBA 3v3 on the computer, for one room. It keeps the lobby and the
 * teams, runs the game, directs the sound and the announcer, and it is
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
  private commentary = new Commentary((id) => this.nameOf(id));
  private readonly unsubscribe: () => void;
  private readonly unpress: () => void;
  private unlistenMatch: (() => void) | null = null;
  private readonly matchListeners = new Set<(event: MatchEvent) => void>();
  private lastHud = 0;
  private lastFrame = 0;
  private bannerKey = 0;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;
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
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.audio.stop();
    this.room.setPlaying(false);
  }

  get phase(): Phase {
    return phaseOf(this.driver);
  }

  /** The game on screen: the real one, or the demo behind the lobby. */
  get match(): Match {
    return this.driver?.match ?? this.demo.match;
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

  setTeam(seat: number, team: TeamId): void {
    if (this.phase === "countdown" || this.phase === "live") return;
    this.lobby.setTeam(seat, team);
    this.refresh(performance.now());
  }

  shuffle(): void {
    if (this.phase === "countdown" || this.phase === "live") return;
    this.lobby.shuffle();
    this.refresh(performance.now());
  }

  /** Starts a game with the teams as they stand, computers filling the gaps. */
  start(): void {
    if (this.phase === "countdown" || this.phase === "live") return;
    this.unlistenMatch?.();
    this.driver = new MatchDriver(this.lobby.entries());
    this.commentary = new Commentary((id) => this.nameOf(id));
    this.unlistenMatch = this.driver.listen((event) => this.onMatchEvent(event));
    this.room.setPlaying(true);
    this.phones.forget();
    this.refresh(performance.now());
  }

  /** From the results: back to the team picker, keeping everyone's choices. */
  backToLobby(): void {
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
    if (event.type === "dunk" && event.power > 0.7) driver.slowMo(0.35, 0.55);
    if (event.type === "block") driver.slowMo(0.45, 0.25);
    if (event.type === "shake" && event.hard) driver.slowMo(0.5, 0.3);
    if (event.type === "win") driver.slowMo(0.3, 0.8);
    if (event.type === "shot" && event.grade === "perfect" && m.athletes[event.id]?.seat !== null) this.audio.green();
    const shown = banner(event, m, (id) => this.nameOf(id), this.bannerKey);
    if (shown) this.showBanner(shown);
    const line = this.commentary.onEvent(event, m);
    if (line?.text) this.audio.announcer.say(line.text, line.priority);
    const prompt = ["score", "win", "go", "check", "checkUp", "foul", "freeThrow"] as const;
    if ((prompt as readonly string[]).includes(event.type)) this.refresh(performance.now());
  }

  private showBanner(shown: BannerText): void {
    const key = ++this.bannerKey;
    store.setState({ banner: { ...shown, key } });
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      if (store.getState().banner?.key === key) store.setState({ banner: null });
    }, BANNER_MS);
  }

  private onPress(seat: number, button: string, down: boolean, stick: { x: number; y: number }): void {
    const driver = this.driver;
    if (!driver || !(BUTTONS as readonly string[]).includes(button)) return;
    if (down) driver.press(seat, button as Button, stick);
    // The phone's own release message usually lands first; this catches one that did not.
    else if (button === "shoot") driver.release(seat);
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
