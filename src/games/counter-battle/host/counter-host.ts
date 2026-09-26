import { HostAim } from "@/games/kit/aim/host-aim";
import type { HostRoomApi, HostRoomEvent, Player } from "@/platform/games/game-api";
import { SoundDirector } from "../audio/sound-director";
import type { BattleEvent } from "../engine/events";
import type { Difficulty, TeamId } from "../engine/fighter";
import { phoneMessageSchema, type Mode, type PhoneMessage, type RoomPhase } from "../protocol";
import type { CameraPose } from "../render/camera/aim-ray";
import { DemoBattle } from "./demo";
import { useCounterStore as store } from "./host-store";
import { buildLineup } from "./lineup";
import { Lobby } from "./lobby";
import { MatchDriver } from "./match-driver";
import { Moments } from "./moments";
import { PhoneLink } from "./phone-link";
import { publish, roomPhaseOf } from "./publish";
import { sceneOf, type Scene } from "./scene";

/** The overlay and the phones are refreshed this often; the canvas every frame. */
const HUD_MS = 100;

/** What the session needs from the renderer: where each player's camera is. */
export interface CameraSource {
  cameraPose(fighter: number): CameraPose | null;
}

/**
 * Counter Battle on the computer, for one room. It keeps the lobby and
 * the teams, runs the match, turns each phone's aim into a point in its
 * player's own view, directs the sound, and is the referee: phones send
 * their aim and buttons, everything they show comes back from here.
 */
export class CounterHost {
  readonly lobby = new Lobby();
  readonly aim: HostAim;
  readonly audio: SoundDirector;
  driver: MatchDriver | null = null;
  private readonly demo = new DemoBattle();
  private readonly phones: PhoneLink;
  private readonly moments: Moments;
  private readonly offRoom: () => void;
  private readonly offFire: () => void;
  private camera: CameraSource | null = null;
  private lastFrame = 0;
  private lastHud = 0;
  private lastPhase: RoomPhase = "lobby";
  /** Browser tests on slow machines run the match faster than real time. Always 1 in play. */
  turbo = 1;
  /** Browser tests play a shorter match. Unset in play, which means five rounds. */
  roundsToWin: number | undefined = undefined;

  constructor(private readonly room: HostRoomApi) {
    this.aim = new HostAim(room);
    this.audio = new SoundDirector(room.audio);
    this.phones = new PhoneLink(room);
    this.moments = new Moments(this.phones, this.audio.announcer, () => this.refresh(performance.now()));
    store.setState({ ...store.getInitialState() });
    for (const player of room.players()) if (player.connected) this.lobby.connect(player.seat);
    this.offRoom = room.on((event) => this.onRoom(event));
    // A trigger pull carries the exact aim of the press: aim there first, then pull.
    this.offFire = this.aim.onFire((seat, point) => {
      const f = this.driver?.fighterOf(seat);
      if (!f) return;
      this.driver!.aim(seat, point, this.camera?.cameraPose(f.id) ?? null);
      this.driver!.trigger(seat, true);
    });
    this.audio.setPhase("lobby");
    this.refresh(performance.now());
  }

  dispose(): void {
    this.offRoom();
    this.offFire();
    this.aim.dispose();
    this.moments.dispose();
    this.audio.stop();
    this.room.setPlaying(false);
  }

  get phase(): RoomPhase {
    return roomPhaseOf(this.driver);
  }

  /** What the canvas draws: the match, or the demo fight behind the lobby. */
  get scene(): Scene {
    return sceneOf(this.driver, this.demo);
  }

  /** The renderer, for turning a player's aim into a point in the world. */
  attachCamera(camera: CameraSource | null): void {
    this.camera = camera;
  }

  /** Everyone in the room, for the aim kit's layer. */
  players(): readonly Player[] {
    return this.room.players();
  }

  setMode(mode: Mode): void {
    if (this.phase !== "lobby") return;
    this.lobby.setMode(mode);
    this.refresh(performance.now());
  }

  setDifficulty(difficulty: Difficulty): void {
    this.lobby.setDifficulty(difficulty);
    this.refresh(performance.now());
  }

  setTeam(seat: number, team: TeamId): void {
    if (this.phase !== "lobby") return;
    this.lobby.setTeam(seat, team);
    this.refresh(performance.now());
  }

  shuffle(): void {
    if (this.phase !== "lobby") return;
    this.lobby.shuffle();
    this.refresh(performance.now());
  }

  /** Starts a match with the teams as they stand, computer players filling the rest. */
  start(): void {
    if (this.phase === "match" || !this.lobby.canStart()) return;
    const seed = Math.floor(Math.random() * 1e9);
    const name = (seat: number) => this.room.players().find((p) => p.seat === seat)?.name || `Player ${seat}`;
    this.driver = new MatchDriver(buildLineup(this.lobby.entries(), name, this.lobby.difficulty, seed), seed, this.roundsToWin);
    for (const player of this.room.players()) if (!player.connected) this.driver.setOnline(player.seat, false);
    this.room.setPlaying(true);
    this.phones.forget();
    this.moments.start(this.driver);
    this.refresh(performance.now());
  }

  /** From the results: back to the lobby, keeping everyone's teams and guns. */
  backToLobby(): void {
    this.driver = null;
    this.room.setPlaying(false);
    this.refresh(performance.now());
  }

  /** Called every animation frame. Returns what happened and the game time that passed, for the drawing. */
  tick(nowMs: number): { events: BattleEvent[]; dt: number } {
    const realDt = this.lastFrame ? Math.min(0.1, (nowMs - this.lastFrame) / 1000) : 0;
    this.lastFrame = nowMs;
    const d = this.driver;
    let events: BattleEvent[];
    let urgent = false;
    if (d) {
      // Each player's gun follows their point in their own view, as the camera moves too.
      for (const f of d.humans) {
        const point = this.aim.point(f.seat!, nowMs);
        if (point) d.aim(f.seat!, point, this.camera?.cameraPose(f.id) ?? null);
      }
      events = d.advance(realDt, this.turbo);
      const ears = this.scene.ears;
      this.audio.hear(events, d.battle, ears);
      this.audio.frame(d.battle, ears, realDt * this.turbo);
      for (const e of events) urgent = this.moments.event(e, d) || urgent;
    } else events = this.demo.advance(realDt);
    const phase = this.phase;
    if (phase !== this.lastPhase) {
      this.lastPhase = phase;
      this.audio.setPhase(phase);
      // The results are a good moment for someone new to scan in for the next match.
      if (phase === "results") this.room.setPlaying(false);
      urgent = true;
    }
    if (urgent || nowMs - this.lastHud >= HUD_MS) this.refresh(nowMs);
    return { events, dt: realDt * (d ? this.turbo : 1) };
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
        this.driver?.trigger(event.seat, false);
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
      default:
        break;
    }
    this.refresh(performance.now());
  }

  private onPhone(seat: number, message: PhoneMessage): void {
    switch (message.kind) {
      case "trigger":
        this.driver?.trigger(seat, message.down);
        return;
      case "reload":
        this.driver?.reload(seat);
        return;
      case "gun":
        this.lobby.setGun(seat, message.gun);
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
    // Each player aims inside their own view: the match's, or the lobby's as it stands.
    const views = this.driver ? null : this.lobby.views();
    for (const seat of this.lobby.connectedSeats) this.aim.setZone(seat, this.driver ? this.driver.viewOf(seat) : (views!.get(seat) ?? null));
    store.setState({ feed: this.moments.feed.entries(nowMs) });
    publish({ nowMs, players: this.room.players(), lobby: this.lobby, driver: this.driver, phones: this.phones });
  }
}
