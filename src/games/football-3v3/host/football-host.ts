import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import { HostPad } from "@/games/kit/pad/host-pad";
import { playerColor } from "@/games/kit/players";
import type { HostRoomApi, Player } from "@/platform/games/game-api";
import { SoundDirector } from "../audio/director";
import { ceremonyTime } from "../engine/ceremony";
import type { MatchEvent } from "../engine/events";
import type { V2 } from "../engine/vec";
import type { MatchView } from "../engine/view";
import { isPadButton, type RoomPhase } from "../protocol";
import type { LobbyRole } from "../roles";
import type { TeamId } from "../teams";
import { registerFootballAdmin } from "./admin";
import { AimSticks } from "./aim-sticks";
import { buzzFor } from "./buzz";
import { CALLOUT_MS, calloutFor } from "./callouts";
import { DemoMatch } from "./demo-match";
import type { Callout } from "./host-store";
import { useFootballStore as store } from "./host-store";
import { routeRoom, type InputTarget } from "./inputs";
import { Lobby } from "./lobby";
import { MatchDriver } from "./match-driver";
import { PhoneLink } from "./phone-link";
import { Names } from "./names";
import { publish } from "./publish";
import { ReplayDirector, type ReplayFrame } from "./replay/director";
import { DEFAULT_FORWARD } from "./steer";

/** The overlay and the phones are refreshed this often; the canvas every frame. */
const HUD_MS = 100;

/**
 * Football 3v3 on the computer, for one room. It keeps the lobby, runs
 * the game, plays the touchdown replays and directs the sound, and it is
 * the referee: phones send their sticks and buttons, and everything they
 * show comes back from here.
 */
export class FootballHost implements InputTarget {
  readonly lobby = new Lobby();
  readonly demo = new DemoMatch();
  readonly audio: SoundDirector;
  readonly replays = new ReplayDirector();
  driver: MatchDriver | null = null;
  /** The way up the screen on the ground, which the canvas updates from the camera each frame. */
  forward: V2 = DEFAULT_FORWARD;
  readonly phones: PhoneLink;
  readonly aims = new AimSticks();
  /** Who each player is on screen: the phones' players by their own names. */
  readonly names: Names;
  private readonly pad: HostPad;
  private readonly offRoom: () => void;
  private readonly offPress: () => void;
  private callout: { value: Callout; until: number } | null = null;
  private lastHud = 0;
  private seed = Math.floor(Math.random() * 1e6);
  private offAdmin: (() => void) | null = null;
  /** The host tapped Stats during the trophy presentation. */
  private statsEarly = false;

  constructor(private readonly room: HostRoomApi) {
    store.setState({ ...store.getInitialState() });
    this.audio = new SoundDirector(room.audio);
    this.phones = new PhoneLink(room);
    this.names = new Names(() => this.driver?.match ?? null, () => room.players());
    this.pad = new HostPad(room);
    this.offPress = this.pad.onPress((seat, button, down, stick) => {
      if (this.vote(seat, down)) return;
      if (isPadButton(button)) this.driver?.press(seat, button, down, stick, this.forward);
    });
    // After a host reload the phones are already sitting in the room.
    for (const player of room.players()) if (player.connected) this.lobby.connect(player.seat);
    this.offRoom = room.on((event) => {
      if (routeRoom(this, event)) this.refresh(performance.now());
    });
    this.audio.lobby();
    this.refresh(performance.now());
  }

  dispose(): void {
    this.offAdmin?.();
    this.offRoom();
    this.offPress();
    this.pad.dispose();
    this.audio.stop();
    this.room.setPlaying(false);
  }

  get phase(): RoomPhase {
    if (!this.driver) return "lobby";
    return this.replays.active ? "replay" : this.driver.match.phase;
  }

  get replayFrame(): ReplayFrame | null {
    return this.replays.frame();
  }

  /** What the canvas draws: the replay, the game, or the demo behind the lobby. */
  get view(): MatchView {
    if (!this.driver) return this.demo.view;
    return this.replayFrame?.view ?? this.driver.view;
  }

  players(): readonly Player[] {
    return this.room.players();
  }

  /** How a player is called out: their own name, or "CPU" and the build. */
  nameOf(id: number): string {
    return this.names.called(id);
  }

  setTeam(seat: number, team: TeamId | null): void {
    if (!this.driver && this.lobby.setTeam(seat, team)) this.refresh(performance.now());
  }

  setRole(seat: number, role: LobbyRole): void {
    if (!this.driver && this.lobby.setRole(seat, role)) this.refresh(performance.now());
  }

  setLevel(level: BotLevel): void {
    if (this.driver) return;
    this.lobby.setLevel(level);
    this.refresh(performance.now());
  }

  startGame(): void {
    if (this.lobby.startBlock()) return;
    this.driver = new MatchDriver(this.lobby.lineup(), this.seed++, this.lobby.level);
    this.offAdmin?.();
    this.offAdmin = registerFootballAdmin(() => this.driver);
    this.replays.stop();
    this.aims.clear();
    this.callout = null;
    this.statsEarly = false;
    this.room.setPlaying(true);
    this.audio.gameStart();
    this.refresh(performance.now());
  }

  /** From the end screen: back to the team picker, keeping everyone's choices. */
  backToLobby(): void {
    this.driver = null;
    this.statsEarly = false;
    this.offAdmin?.();
    this.offAdmin = null;
    this.replays.stop();
    this.room.setPlaying(false);
    this.audio.lobby();
    this.refresh(performance.now());
  }

  /** From the trophy presentation: straight to the stats, without waiting for them. */
  showStats(): void {
    this.statsEarly = true;
    this.refresh(performance.now());
  }

  /** Called every animation frame. Returns the frame's events for the renderer. */
  tick(nowMs: number): MatchEvent[] {
    const before = this.phase;
    const driver = this.driver;
    let events: MatchEvent[] = [];
    if (!driver) events = this.demo.tick(nowMs);
    else if (this.replays.active) {
      if (this.replays.update(nowMs)) this.endReplay();
    } else {
      events = driver.tick(nowMs, { move: (s) => this.pad.stick(s, nowMs), aim: (s) => this.aims.get(s), forward: this.forward });
      for (const event of events) this.onMatchEvent(event, driver, nowMs);
      if (driver.held) this.startReplay(driver, nowMs);
      this.audio.ceremony(ceremonyTime(driver.match));
    }
    if (this.callout && nowMs > this.callout.until) this.callout = null;
    if (this.phase !== before || nowMs - this.lastHud >= HUD_MS) this.refresh(nowMs);
    return events;
  }

  private startReplay(driver: MatchDriver, nowMs: number): void {
    const voters = driver.match.athletes.filter((a) => a.seat !== null && !a.auto).map((a) => a.seat!);
    if (driver.replayFor === null || !this.replays.start(driver.recorder.all, driver.replayFor, voters, nowMs)) return driver.resume();
    this.aims.clear();
    this.audio.replayIn();
  }

  endReplay(): void {
    this.replays.stop();
    this.driver?.resume();
    this.audio.replayOut();
    this.refresh(performance.now());
  }

  /** During a replay any button is a vote to skip it. True when the press was taken as one. */
  vote(seat: number, down: boolean): boolean {
    if (!this.replays.active) return false;
    if (down && this.replays.vote(seat)) this.endReplay();
    else this.refresh(performance.now());
    return true;
  }

  private onMatchEvent(event: MatchEvent, driver: MatchDriver, nowMs: number): void {
    this.audio.event(event);
    for (const [seat, kind] of buzzFor(event, driver.match)) this.phones.buzz(seat, kind);
    const said = calloutFor(event, driver.match, (id) => this.nameOf(id));
    if (said) this.callout = { value: said, until: nowMs + CALLOUT_MS };
    if (event.type === "win") this.aims.clear();
  }

  private refresh(nowMs: number): void {
    this.lastHud = nowMs;
    publish({
      nowMs, phase: this.phase, players: this.room.players(), lobby: this.lobby, driver: this.driver,
      callout: this.callout?.value ?? null, phones: this.phones, replay: this.replays, nameOf: (id) => this.nameOf(id),
      statsEarly: this.statsEarly,
    });
  }
}

