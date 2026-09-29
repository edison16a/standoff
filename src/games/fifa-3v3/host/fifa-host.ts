import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import { HostPad } from "@/games/kit/pad/host-pad";
import { playerColor } from "@/games/kit/players";
import type { HostRoomApi, HostRoomEvent } from "@/platform/games/game-api";
import { SoundDirector } from "../audio/director";
import type { MatchEvent } from "../engine/events";
import type { MatchView } from "../engine/view";
import { phoneMessageSchema, type PhoneMessage, type RoomPhase } from "../protocol";
import type { Label } from "../render/match-renderer";
import { computerName } from "../builds";
import { TEAMS, type TeamId } from "../teams";
import type { Role } from "../roles";
import { registerSoccerAdmin } from "./admin";
import { DemoMatch } from "./demo-match";
import { buzzFor } from "./buzz";
import { useFifaStore as store } from "./host-store";
import { Lobby } from "./lobby";
import { MatchDriver } from "./match-driver";
import { nameOf } from "./names";
import { PhoneLink } from "./phone-link";
import { publish } from "./publish";
import type { ReplayFrame } from "./replay";
import { ReplayDirector } from "./replay-director";
import type { ReplayScript } from "./replay-script";

/** The overlay and the phones are refreshed this often; the canvas every frame. */
const HUD_MS = 100;

/**
 * Soccer 3v3 on the computer, for one room. It keeps the lobby, runs the
 * match and directs the sound, and it is the referee: phones send their
 * stick and buttons, and everything they show comes back from here.
 */
export class FifaHost {
  readonly lobby = new Lobby();
  readonly demo = new DemoMatch();
  readonly audio: SoundDirector;
  driver: MatchDriver | null = null;
  private readonly pad: HostPad;
  private readonly phones: PhoneLink;
  private readonly replays = new ReplayDirector();
  private readonly unsubscribe: () => void;
  private readonly unpress: () => void;
  private lastHud = 0;
  private seed = Math.floor(Math.random() * 1e6);
  private unadmin: (() => void) | null = null;

  constructor(private readonly room: HostRoomApi) {
    store.setState({ ...store.getInitialState() });
    this.audio = new SoundDirector(room.audio);
    this.phones = new PhoneLink(room);
    this.pad = new HostPad(room);
    this.unpress = this.pad.onPress((seat, button, down, stick) => this.onPress(seat, button, down, stick.x, stick.y));
    // After a host reload the phones are already sitting in the room.
    for (const player of room.players()) if (player.connected) this.lobby.connect(player.seat);
    this.unsubscribe = room.on((event) => this.onRoom(event));
    this.audio.lobby();
    this.refresh(performance.now());
  }

  dispose(): void {
    this.unadmin?.();
    this.unsubscribe();
    this.unpress();
    this.pad.dispose();
    this.audio.stop();
    this.room.setPlaying(false);
  }

  get phase(): RoomPhase {
    return this.driver ? this.driver.state.phase : "lobby";
  }

  /** The replay's still and stage right now, or null outside a replay. */
  get replayFrame(): ReplayFrame | null {
    return this.driver ? this.replays.frame(this.driver) : null;
  }

  /** The replay's plan, for the camera: who kicked it and whose keeper was beaten. */
  get replayScript(): ReplayScript | null {
    return this.replays.active ? (this.driver?.replay.script ?? null) : null;
  }

  /** What the canvas draws: the replay, the match, or the demo behind the lobby. */
  get view(): MatchView {
    const driver = this.driver;
    if (!driver) return this.demo.view;
    return this.replayFrame?.view ?? driver.view;
  }

  /** How a player is called out: a phone's player by their own name, a computer by its build. */
  calledName(id: number): string {
    const a = this.driver?.state.athletes[id];
    return a ? nameOf(a, this.names()) : "";
  }

  /**
   * The tag over a player on the pitch, and the name on their shirt. A
   * phone's player keeps their name while away, in a computer's quieter
   * tag, since a computer plays for them until they are back.
   */
  label(id: number): Label {
    const a = this.view.athletes[id];
    if (!a) return { name: "", colour: "#ffffff", human: false };
    const seat = this.driver?.state.athletes[id]?.seat ?? null;
    if (seat === null) return { name: computerName(a.build), colour: TEAMS[a.team].color, human: false };
    const name = nameOf({ seat, build: a.build }, this.names());
    return { name, colour: a.seat !== null ? playerColor(seat) : TEAMS[a.team].color, human: a.seat !== null, shirt: name };
  }

  private names(): Map<number, string> {
    return new Map(this.room.players().map((p) => [p.seat, p.name]));
  }

  setTeam(seat: number, team: TeamId | null): void {
    if (this.lobby.setTeam(seat, team)) this.refresh(performance.now());
  }

  /** The host hands a player their place in the side. */
  setRole(seat: number, role: Role): void {
    if (!this.driver && this.lobby.setRole(seat, role)) this.refresh(performance.now());
  }

  /** How sharp the computer players are in the next match. */
  setLevel(level: BotLevel): void {
    if (this.driver) return;
    this.lobby.setLevel(level);
    this.refresh(performance.now());
  }

  /** Computer players on or off, for the next match. */
  setBots(on: boolean): void {
    if (this.driver) return;
    this.lobby.setBots(on);
    this.refresh(performance.now());
  }

  /** Starts a match with every ready player, computers filling the gaps if they are on. */
  startMatch(): void {
    if (this.lobby.startBlock()) return;
    this.driver = new MatchDriver(this.lobby.entrants(), this.seed++, this.lobby.level);
    this.unadmin?.();
    this.unadmin = registerSoccerAdmin(() => this.driver);
    this.replays.stop();
    this.room.setPlaying(true);
    this.audio.matchStart();
    this.refresh(performance.now());
  }

  /** From the results: back to the team picker, keeping everyone's choices. */
  backToLobby(): void {
    this.driver = null;
    this.unadmin?.();
    this.unadmin = null;
    this.replays.stop();
    this.room.setPlaying(false);
    this.audio.lobby();
    this.refresh(performance.now());
  }

  /** Called every animation frame. Returns the frame's events for the renderer's effects. */
  tick(nowMs: number): MatchEvent[] {
    const before = this.phase;
    const driver = this.driver;
    const events = driver ? driver.tick(nowMs, this.pad) : this.demo.tick(nowMs);
    let changed = false;
    if (driver) {
      for (const event of events) this.onMatchEvent(event, driver);
      changed = this.replays.update(driver);
    }
    if (changed || this.phase !== before || nowMs - this.lastHud >= HUD_MS) this.refresh(nowMs);
    return events;
  }

  /** A phone's button. During a replay any button is a vote to skip it; otherwise it goes to the match. */
  private onPress(seat: number, button: string, down: boolean, x: number, y: number): void {
    const driver = this.driver;
    if (!driver) return;
    if (this.replays.active) {
      if (down && this.replays.vote(driver, seat)) this.refresh(performance.now());
      return;
    }
    driver.press(seat, button, down, x, y);
  }

  private onMatchEvent(event: MatchEvent, driver: MatchDriver): void {
    this.audio.event(event);
    for (const [seat, kind] of buzzFor(event, driver.state)) this.phones.buzz(seat, kind);
    if (event.type === "goal" || event.type === "fulltime" || event.type === "save") this.refresh(performance.now());
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
        if (this.driver) this.replays.left(this.driver, event.seat);
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
      case "pick":
        this.lobby.pick(seat, message.build);
        break;
      case "ready":
        this.lobby.setReady(seat, message.ready);
        break;
      case "hello":
        this.phones.forget(seat);
        break;
      case "release":
        // Mid match only, and nothing on screen changes, so no refresh either.
        this.driver?.noteHeld(seat, message.heldMs / 1000);
        return;
    }
    this.refresh(performance.now());
  }

  private refresh(nowMs: number): void {
    this.lastHud = nowMs;
    const nameOf = (id: number) => this.calledName(id);
    publish({ nowMs, phase: this.phase, players: this.room.players(), lobby: this.lobby, driver: this.driver, phones: this.phones, replay: this.replays, nameOf });
  }
}
