import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { HostRoomApi } from "@/platform/games/game-api";
import type { SocketStatus } from "@/platform/net/socket-client";
import type { Payload, Seat, ServerEnvelope } from "@/platform/protocol";
import { createHostApi } from "./host-api";
import { HostAudio } from "./host-audio";
import { HostConnection } from "./host-connection";
import { HostEvents } from "./host-events";
import { HostPlayers } from "./host-players";
import { useHostStore } from "./host-store";
import { RoomCandidate } from "./room-candidate";
import { RoomGuard } from "./room-guard";
import type { OpenedRoom } from "./room-keeper";
import type { RememberedRoom } from "./room-memory";

const set = useHostStore.setState;
const get = useHostStore.getState;

/**
 * The computer's side of the platform. It keeps the connection and the
 * room (see HostConnection), tracks who sits where, and hands the game a
 * HostRoomApi to talk to its phones. It knows nothing about any particular
 * game. The room is checked and remade when it breaks (see RoomGuard).
 */
export class HostRoom {
  private readonly sound = new HostAudio();
  private readonly connection: HostConnection;
  private readonly events = new HostEvents();
  private readonly players: HostPlayers;
  private readonly guard: RoomGuard;
  private current: HostRoomApi | null = null;
  /** The room on screen, or the one a reload remembered, to make again if it is lost. */
  private last: RememberedRoom | null = null;
  private shared = true;
  private detach: () => void = () => undefined;

  constructor() {
    this.connection = new HostConnection({
      room: {
        opened: (room) => this.onOpened(room),
        doubt: () => this.guard.doubt(),
        lost: ({ old }) => this.onLost(old),
        failed: () => this.goHome("Could not open a room. Check the connection and try again."),
      },
      message: (message) => this.onMessage(message),
      status: (status) => this.onStatus(status),
      // Any instance of this deployment can take the room over, so a refusal
      // means a deploy: check now, and once the tries are spent, say it is closing.
      handoverFailed: ({ final }) => (final && get().room ? this.guard.trouble("ending") : this.guard.watchdog.checkNow()),
      names: () => this.players.names(),
      shared: () => this.shared,
    });
    this.players = new HostPlayers({ emit: (event) => this.events.emit(event), send: (to, payload) => this.send(to, payload) });
    this.guard = new RoomGuard({
      probe: (code) => this.connection.check(code),
      follow: () => this.connection.mover.follow(),
      snapshot: () => this.last,
      joined: () => this.players.joined,
      phonesConnected: () => this.players.connected,
      shared: () => this.shared,
      makeCandidate: () => new RoomCandidate(),
      swap: (candidate, room, old) => {
        this.connection.swap(candidate, room, old);
        this.onOpened(room);
      },
      goHome: (error) => this.goHome(error),
    });
    this.last = this.connection.remembered;
    // A reload resumes its room. Creating another meanwhile would race it.
    set({ resuming: this.last !== null });
  }

  get audio(): AudioEngine {
    return this.sound.get();
  }

  /** The open room as the game sees it. Null on the home screen. */
  get api(): HostRoomApi | null {
    return this.current;
  }

  connect(): void {
    this.sound.listen();
    this.detach = this.guard.attach();
    this.connection.connect();
  }

  dispose(): void {
    this.detach();
    this.guard.stop();
    this.connection.close();
    this.sound.close();
  }

  /** Runs inside the Play click, which is also what lets the browser start sound. */
  async create(game: string, seats: number): Promise<void> {
    const state = get();
    // A second click, or a room already open or coming back, would make a second room.
    if (state.opening || state.room || state.resuming) return;
    set({ opening: true, error: null });
    await this.audio.unlock();
    this.connection.create(game, seats);
  }

  /** Regenerate room and Remake lobby: a new room for the same game, with the phones moved to it. */
  regenerate(): void {
    this.guard.regenerate("manual");
  }

  /** "Keep this room" on the alert: carry on with the room as it is. */
  keepRoom(): void {
    this.guard.keep();
  }

  /** Ends the room for everyone, confirmed by the relay so no phone is left in it, and goes home. */
  leave(): void {
    this.connection.leave();
    this.goHome(null);
  }

  private goHome(error: string | null): void {
    this.current = null;
    this.last = null;
    this.events.clear();
    this.guard.stop();
    this.connection.mover.stop();
    set({ screen: "home", room: null, players: [], playing: false, resuming: false, opening: false, error, health: "idle", problem: null, roomGone: false, joinHidden: false });
  }

  private onStatus(status: SocketStatus): void {
    set({ status });
    // Another tab resumed this room. This one steps back rather than play to nobody.
    if (status === "replaced") return this.goHome(null);
    this.events.emit({ type: "online", online: status === "open" });
  }

  private onOpened(room: OpenedRoom): void {
    const { code, joinUrl, game, seats } = room;
    // The room already on screen means the socket reconnected or moved,
    // not a page reload. The game keeps running and is told to resync.
    const same = room.connected !== null && get().room?.code === code;
    const players = this.players.open(room, same);
    if (!same) {
      this.events.clear();
      this.current = this.makeApi(code, seats);
    }
    this.last = { code, token: room.token, game, seats };
    this.shared = room.sharedRooms;
    set({ screen: "room", room: { code, joinUrl, game, seats }, players, resuming: false, opening: false, error: null });
    this.guard.opened(code, same);
    if (same) {
      this.events.emit({ type: "players" });
      this.events.emit({ type: "resync" });
    }
    this.players.share();
  }

  /** The relay no longer has the room. With nothing on screen, a reload's room is made again. */
  private onLost(old: RememberedRoom | null): void {
    if (get().room) return this.guard.trouble("lost");
    this.last = old;
    if (!this.guard.regenerate("auto")) this.goHome(old ? "The room was lost. Host the game again." : null);
  }

  private onMessage(message: ServerEnvelope): void {
    if (message.type !== "peer:joined" && message.type !== "peer:left" && message.type !== "peer:message") return;
    const { mover } = this.connection;
    if (message.type === "peer:joined") {
      mover.back(message.seat);
      // A phone got in, which is the best check there is.
      this.guard.watchdog.passed();
    }
    if (message.type === "peer:left") mover.left(message.seat);
    this.players.receive(message);
  }

  private send(to: Seat | "all", payload: Payload): void {
    this.connection.send({ type: "host:send", to, payload });
  }

  private makeApi(code: string, seats: number): HostRoomApi {
    return createHostApi(code, seats, {
      audio: () => this.audio,
      subscribe: (listener) => this.events.subscribe(listener),
      send: (to, payload) => this.send(to, payload),
      leave: () => this.leave(),
      live: (api) => this.current === api,
    });
  }
}
