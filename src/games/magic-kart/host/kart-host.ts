import type { HostRoomApi, HostRoomEvent } from "@/platform/games/game-api";
import { SoundDirector } from "../audio/sound-director";
import type { RaceEvent } from "../engine/events";
import type { RaceWorld } from "../engine/world";
import { phoneMessageSchema, type Phase, type PhoneMessage } from "../protocol";
import { findTrack, type TrackId } from "../tracks";
import { Banners } from "./banners";
import { DemoRace } from "./demo-race";
import { useKartStore as store } from "./host-store";
import { Lobby } from "./lobby";
import { PhoneLink } from "./phone-link";
import { publish } from "./publish";
import { RaceDriver } from "./race-driver";
import { kartColor, kartName } from "./snapshots";

/** The overlay and the phones are refreshed this often, the canvas every frame. */
const HUD_MS = 100;
const BUZZ = { hit: "hit", pickup: "pickup", boost: "boost", lap: "lap", finish: "finish", bump: "bump" } as const;

/**
 * Magic Kart on the computer, for one room. It keeps the lobby, runs the
 * race and directs the sound, and it is the referee: phones send the
 * wheel and pedals, and everything they show comes back from here.
 */
export class KartHost {
  readonly lobby = new Lobby();
  driver: RaceDriver | null = null;
  readonly demo: DemoRace;
  readonly audio: SoundDirector;
  private readonly phones: PhoneLink;
  private readonly banners = new Banners();
  private readonly unsubscribe: () => void;
  private unlistenRace: (() => void) | null = null;
  private readonly raceListeners = new Set<(event: RaceEvent) => void>();
  private lastHud = 0;

  constructor(private readonly room: HostRoomApi) {
    this.audio = new SoundDirector(room.audio);
    this.phones = new PhoneLink(room);
    store.setState({ ...store.getInitialState() });
    this.demo = new DemoRace(store.getState().mapId);
    // After a host reload the phones are already sitting in the room.
    for (const player of room.players()) if (player.connected) this.lobby.connect(player.seat);
    this.unsubscribe = room.on((event) => this.onRoom(event));
    this.audio.setPhase("lobby", store.getState().mapId);
    this.refresh(performance.now());
  }

  dispose(): void {
    this.unsubscribe();
    this.unlistenRace?.();
    this.driver = null;
    this.audio.stop();
    this.room.setPlaying(false);
  }

  get phase(): Phase {
    const world = this.driver?.world;
    if (!world) return "lobby";
    return world.phase === "countdown" ? "countdown" : world.phase === "racing" ? "racing" : "results";
  }

  /** The race on screen: the real one, or the demo behind the lobby. */
  get world(): RaceWorld {
    return this.driver?.world ?? this.demo.world;
  }

  /** The name and colour a kart is shown with. */
  label(kartId: number): { name: string; color: string } {
    const kart = this.world.karts[kartId];
    if (!kart) return { name: "", color: "#ffffff" };
    return { name: kartName(kart, this.names()), color: kartColor(kart) };
  }

  /** Race events for the renderer's sparks, from whichever race is running. */
  listen(listener: (event: RaceEvent) => void): () => void {
    this.raceListeners.add(listener);
    return () => this.raceListeners.delete(listener);
  }

  setMap(id: TrackId): void {
    if (this.driver) return;
    store.setState({ mapId: id });
    this.demo.setMap(id);
    this.audio.setPhase("lobby", id);
    this.refresh(performance.now());
  }

  setComputers(on: boolean): void {
    store.setState({ computers: on });
  }

  /** Starts a race on the chosen map with every ready player. */
  startRace(): void {
    // From the lobby or the results only, and never with nobody to race.
    if (this.phase === "countdown" || this.phase === "racing" || this.lobby.readySeats.length === 0) return;
    const { mapId, computers } = store.getState();
    this.unlistenRace?.();
    this.driver = new RaceDriver(findTrack(mapId), this.lobby.entrants(computers));
    this.unlistenRace = this.driver.listen((event) => this.onRaceEvent(event));
    this.banners.clear();
    this.room.setPlaying(true);
    this.audio.setPhase("countdown", mapId);
    this.refresh(performance.now());
  }

  /** From the results: back to the map picker, keeping everyone's choices. */
  backToLobby(): void {
    this.unlistenRace?.();
    this.unlistenRace = null;
    this.driver = null;
    this.room.setPlaying(false);
    this.audio.setPhase("lobby", store.getState().mapId);
    this.refresh(performance.now());
  }

  /** Called every animation frame while the screen is up. */
  tick(nowMs: number): void {
    const before = this.phase;
    if (this.driver) this.driver.tick(nowMs);
    else this.demo.tick(nowMs);
    const phase = this.phase;
    if (phase !== before) this.audio.setPhase(phase, store.getState().mapId);
    if (this.driver) this.audio.frame(this.driver.world);
    if (nowMs - this.lastHud >= HUD_MS || phase !== before) this.refresh(nowMs);
  }

  private onRaceEvent(event: RaceEvent): void {
    const world = this.driver?.world;
    if (!world) return;
    this.audio.event(event, world);
    this.banners.onEvent(event, world);
    for (const listener of this.raceListeners) listener(event);
    const kart = "kart" in event ? world.karts[event.kart] : undefined;
    if (kart && kart.seat !== null && event.type in BUZZ) this.phones.buzz(kart.seat, BUZZ[event.type as keyof typeof BUZZ]);
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
      case "input":
        this.driver?.input(seat, message, performance.now());
        return;
      case "use":
        this.driver?.use(seat);
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

  private names(): Map<number, string> {
    return new Map(this.room.players().map((p) => [p.seat, p.name]));
  }

  /** Brings the overlay and every phone up to date. */
  private refresh(nowMs: number): void {
    this.lastHud = nowMs;
    publish({
      nowMs,
      phase: this.phase,
      players: this.room.players(),
      names: this.names(),
      lobby: this.lobby,
      driver: this.driver,
      banners: this.banners,
      phones: this.phones,
    });
  }
}
