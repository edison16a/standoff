import { HostPad } from "@/games/kit/pad/host-pad";
import { playerColor } from "@/games/kit/players";
import type { HostRoomApi, HostRoomEvent } from "@/platform/games/game-api";
import { SoundDirector } from "../audio/director";
import type { MatchEvent } from "../engine/events";
import type { MatchView } from "../engine/view";
import { phoneMessageSchema, type PhoneMessage, type RoomPhase } from "../protocol";
import type { Label } from "../render/match-renderer";
import { ROSTER } from "../roster";
import { TEAMS, type TeamId } from "../teams";
import { Banners } from "./banners";
import { DemoMatch } from "./demo-match";
import { buzzFor } from "./buzz";
import { useFifaStore as store } from "./host-store";
import { Lobby } from "./lobby";
import { MatchDriver } from "./match-driver";
import { PhoneLink } from "./phone-link";
import { publish } from "./publish";

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
  private readonly banners: Banners;
  private readonly unsubscribe: () => void;
  private readonly unpress: () => void;
  private lastHud = 0;
  private seed = Math.floor(Math.random() * 1e6);
  private replaying = false;
  private goals = 0;
  private lastTick = 0;

  constructor(private readonly room: HostRoomApi) {
    store.setState({ ...store.getInitialState() });
    this.audio = new SoundDirector(room.audio, (id) => this.calledName(id));
    this.banners = new Banners((id) => this.calledName(id));
    this.phones = new PhoneLink(room);
    this.pad = new HostPad(room);
    this.unpress = this.pad.onPress((seat, button, down, stick) => this.driver?.press(seat, button, down, stick.x, stick.y));
    // After a host reload the phones are already sitting in the room.
    for (const player of room.players()) if (player.connected) this.lobby.connect(player.seat);
    this.unsubscribe = room.on((event) => this.onRoom(event));
    this.audio.lobby();
    this.refresh(performance.now());
  }

  dispose(): void {
    this.unsubscribe();
    this.unpress();
    this.pad.dispose();
    this.audio.stop();
    this.room.setPlaying(false);
  }

  get phase(): RoomPhase {
    return this.driver ? this.driver.state.phase : "lobby";
  }

  get replay(): boolean {
    return this.replaying;
  }

  get goalCount(): number {
    return this.goals;
  }

  /** What the canvas draws: the replay, the match, or the demo behind the lobby. */
  get view(): MatchView {
    const driver = this.driver;
    if (!driver) return this.demo.view;
    if (this.replaying) return driver.replay.at(driver.state.phaseT) ?? driver.view;
    return driver.view;
  }

  /** How a player is called out: a phone's player by their name, a computer by the star's. */
  calledName(id: number): string {
    const a = this.driver?.state.athletes[id];
    if (!a) return "";
    const player = a.seat !== null ? this.room.players().find((p) => p.seat === a.seat) : undefined;
    return player?.name ?? ROSTER[a.character].name.split(" ").slice(-1)[0]!;
  }

  /** The tag over a player on the pitch. */
  label(id: number): Label {
    const view = this.view;
    const a = view.athletes[id];
    if (!a) return { name: "", colour: "#ffffff", human: false };
    if (!this.driver || a.seat === null) return { name: ROSTER[a.character].short, colour: TEAMS[a.team].color, human: false };
    const player = this.room.players().find((p) => p.seat === a.seat);
    return { name: player?.name ?? ROSTER[a.character].short, colour: playerColor(a.seat), human: true };
  }

  setTeam(seat: number, team: TeamId | null): void {
    if (this.lobby.setTeam(seat, team)) this.refresh(performance.now());
  }

  /** Starts a match with every ready player, computers filling the gaps. */
  startMatch(): void {
    if (this.lobby.players.length === 0) return;
    this.driver = new MatchDriver(this.lobby.entrants(), this.seed++);
    this.replaying = false;
    this.goals = 0;
    this.banners.clear();
    this.room.setPlaying(true);
    this.audio.matchStart();
    this.refresh(performance.now());
  }

  /** From the results: back to the team picker, keeping everyone's choices. */
  backToLobby(): void {
    this.driver = null;
    this.replaying = false;
    this.banners.clear();
    this.room.setPlaying(false);
    this.audio.lobby();
    this.refresh(performance.now());
  }

  /** Called every animation frame. Returns the frame's events for the renderer's effects. */
  tick(nowMs: number): MatchEvent[] {
    const before = this.phase;
    const driver = this.driver;
    const events = driver ? driver.tick(nowMs, this.pad) : this.demo.tick(nowMs);
    if (driver) {
      for (const event of events) this.onMatchEvent(event, driver);
      if (driver.state.phase === "replay" && !this.replaying) this.replaying = driver.replay.cut();
      if (driver.state.phase !== "replay") this.replaying = false;
      this.audio.frame(driver.view, this.lastTick ? Math.min(0.1, (nowMs - this.lastTick) / 1000) : 0);
    }
    this.lastTick = nowMs;
    const time = nowMs / 1000;
    const expired = this.banners.expire(time);
    if (expired || this.phase !== before || nowMs - this.lastHud >= HUD_MS) this.refresh(nowMs);
    return events;
  }

  private onMatchEvent(event: MatchEvent, driver: MatchDriver): void {
    this.audio.event(event);
    this.banners.onEvent(event, performance.now() / 1000);
    if (event.type === "goal") this.goals++;
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
        this.lobby.pick(seat, message.character);
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
    publish({ nowMs, phase: this.phase, players: this.room.players(), lobby: this.lobby, driver: this.driver, banners: this.banners, phones: this.phones, replay: this.replaying });
  }
}
