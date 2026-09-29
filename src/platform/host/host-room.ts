import { AudioEngine } from "@/platform/audio/audio-engine";
import type { HostRoomApi } from "@/platform/games/game-api";
import { probeRoom } from "@/platform/net/room-probe";
import type { SocketStatus } from "@/platform/net/socket-client";
import type { Payload, Seat, ServerEnvelope } from "@/platform/protocol";
import { createHostApi } from "./host-api";
import { HostEvents } from "./host-events";
import { HostLink } from "./host-link";
import { HostPlayers } from "./host-players";
import { useHostStore } from "./host-store";
import { RoomCandidate } from "./room-candidate";
import { RoomGuard } from "./room-guard";
import { RoomKeeper, type OpenedRoom, type RoomKeeperEvents } from "./room-keeper";
import { sessionMemory, type RememberedRoom } from "./room-memory";

/** Back from the background after this long, the room is checked again at once. */
const AWAY_CHECK_MS = 20_000;
const set = useHostStore.setState;
const get = useHostStore.getState;

/**
 * The computer's side of the platform. It keeps the connection and the
 * room, tracks who sits where, and hands the game a HostRoomApi to talk to
 * its phones. It knows nothing about any particular game. The room is
 * checked and remade when it breaks (see RoomGuard), and a remade room
 * arrives on its own fresh connection, which then becomes the host's.
 */
export class HostRoom {
  private engine: AudioEngine | null = null;
  private readonly link: HostLink;
  private keeper: RoomKeeper;
  private readonly events = new HostEvents();
  private readonly players: HostPlayers;
  private readonly guard: RoomGuard;
  private current: HostRoomApi | null = null;
  /** The room on screen, or the one a reload remembered, to make again if it is lost. */
  private last: RememberedRoom | null = null;
  private hiddenAt: number | null = null;
  private shared = true;
  private readonly unwatchStore: () => void;
  private readonly keeperEvents: RoomKeeperEvents = {
    opened: (room) => this.onOpened(room),
    lost: ({ old }) => this.onLost(old),
    failed: () => this.goHome("Could not open a room. Check the connection and try again."),
  };

  constructor() {
    this.link = new HostLink({
      onOpen: (send, info) => this.keeper.announce(send, info),
      onMessage: (message) => this.onMessage(message),
      onStatus: (status) => this.onStatus(status),
      // A new socket that cannot find the room is the first sign a deploy or a new instance took it.
      onHandoverFailed: () => this.guard.watchdog.checkNow(),
    });
    this.keeper = new RoomKeeper(sessionMemory, { send: (m) => this.link.send(m), redial: () => this.link.redial() }, this.keeperEvents);
    this.players = new HostPlayers({ emit: (event) => this.events.emit(event), send: (to, payload) => this.send(to, payload) });
    this.guard = new RoomGuard({
      probe: (code) => probeRoom({ code, token: this.keeper.memory.recall()?.token ?? "" }),
      snapshot: () => this.last,
      joined: () => this.players.joined,
      phonesConnected: () => this.players.connected,
      shared: () => this.shared,
      makeCandidate: () => new RoomCandidate(),
      swap: (candidate, room, old) => this.swap(candidate, room, old),
      goHome: (error) => this.goHome(error),
    });
    this.last = this.keeper.memory.recall();
    // A game ending is a good moment to look at the room again.
    this.unwatchStore = useHostStore.subscribe((state, before) => {
      if (before.playing && !state.playing) this.guard.watchdog.checkNow();
    });
    // A reload resumes its room. Creating another meanwhile would race it.
    set({ resuming: this.keeper.holding });
  }

  private readonly unlockOnTap = () => {
    void this.audio.unlock().then(() => {
      if (this.audio.unlocked) window.removeEventListener("pointerdown", this.unlockOnTap);
    });
  };

  private readonly onVisibility = () => {
    if (document.hidden) this.hiddenAt = Date.now();
    else if (this.hiddenAt !== null && Date.now() - this.hiddenAt > AWAY_CHECK_MS) this.guard.watchdog.checkNow();
    if (!document.hidden) this.hiddenAt = null;
  };

  /** Made on first use and again after `dispose`, since React mounts twice in development. */
  get audio(): AudioEngine {
    this.engine ??= new AudioEngine();
    return this.engine;
  }

  /** The open room as the game sees it. Null on the home screen. */
  get api(): HostRoomApi | null {
    return this.current;
  }

  connect(): void {
    // After a reload there was no click to start the sound, so the first tap anywhere does it.
    window.addEventListener("pointerdown", this.unlockOnTap);
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", this.onVisibility);
    this.link.connect();
  }

  dispose(): void {
    window.removeEventListener("pointerdown", this.unlockOnTap);
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.onVisibility);
    this.unwatchStore();
    this.guard.stop();
    this.keeper.dispose();
    this.link.close();
    this.engine?.close();
    this.engine = null;
  }

  /** Runs inside the Play click, which is also what lets the browser start sound. */
  async create(game: string, seats: number): Promise<void> {
    const state = get();
    // A second click, or a room already open or coming back, would make a second room.
    if (state.opening || state.room || state.resuming) return;
    set({ opening: true, error: null });
    await this.audio.unlock();
    this.keeper.create(game, seats);
  }

  /** Regenerate room and Remake lobby: a new room for the same game, with the phones moved to it. */
  regenerate(): void {
    this.guard.regenerate("manual");
  }

  /** "Keep this room" on the alert: carry on with the room as it is. */
  keepRoom(): void {
    this.guard.keep();
  }

  /** Ends the room for everyone and goes back to the home screen. */
  leave(): void {
    const room = this.keeper.memory.recall();
    // Sent again until the relay confirms, so no phone is left in the old game.
    if (room) this.keeper.retire(room);
    this.keeper.forget();
    this.goHome(null);
  }

  private goHome(error: string | null): void {
    this.current = null;
    this.last = null;
    this.events.clear();
    this.guard.stop();
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

  /** The new room passed its check. Its socket becomes the host's, and the old room sends its phones on. */
  private swap(candidate: RoomCandidate, room: OpenedRoom, old: RememberedRoom): void {
    const previous = this.link.adopt(candidate.handOver());
    this.keeper.dispose();
    this.keeper = candidate.keeper;
    this.keeper.memory = sessionMemory;
    this.keeper.events = this.keeperEvents;
    this.keeper.adopt(room);
    this.onOpened(room);
    // Through the new socket, which any instance with the store can act on,
    // and once through the old one, which sits where the old room lives.
    this.keeper.retire(old, room.code);
    if (old.token) previous.client.send({ type: "host:retire", code: old.code, token: old.token, movedTo: room.code });
    this.link.retireOld(previous);
  }

  private onMessage(message: ServerEnvelope): void {
    switch (message.type) {
      case "room:created":
      case "room:resumed":
      case "room:error":
      case "room:retired":
        return this.keeper.handle(message);
      case "room:probe":
        return this.link.send({ type: "host:echo", nonce: message.nonce });
      case "peer:joined":
        this.players.arrived(message.seat, message.name);
        // A phone got in, which is the best check there is.
        this.guard.watchdog.passed();
        return this.events.emit({ type: "joined", seat: message.seat, rejoined: message.rejoined });
      case "peer:left":
        this.players.left(message.seat);
        return this.events.emit({ type: "left", seat: message.seat });
      case "peer:message":
        return this.players.fromPhone(message.seat, message.payload);
    }
  }

  private send(to: Seat | "all", payload: Payload): void {
    this.link.send({ type: "host:send", to, payload });
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
