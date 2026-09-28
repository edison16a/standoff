import { AudioEngine } from "@/platform/audio/audio-engine";
import { RESERVED_KINDS, type HostRoomApi, type HostRoomEvent, type Player } from "@/platform/games/game-api";
import { SocketClient, type SocketStatus } from "@/platform/net/socket-client";
import { defaultName, nameKey } from "@/platform/profile";
import { profileSchema, type Payload, type Seat, type ServerEnvelope } from "@/platform/protocol";
import { createHostApi } from "./host-api";
import { useHostStore } from "./host-store";
import { RoomKeeper, type OpenedRoom } from "./room-keeper";

const reserved = new Set<string>(RESERVED_KINDS);
/** Enough for every phone's setup messages, small enough that a stuck game never piles them up. */
const BACKLOG_MAX = 200;

/**
 * The computer's side of the platform. It keeps the connection and the
 * room, tracks who sits where and what they are called, and hands the
 * game a HostRoomApi to talk to its phones. It knows nothing about any
 * particular game.
 */
export class HostRoom {
  private engine: AudioEngine | null = null;
  private readonly socket: SocketClient;
  private readonly keeper: RoomKeeper;
  private readonly listeners = new Set<(event: HostRoomEvent) => void>();
  /**
   * Phone messages that arrive before the game is listening. After a
   * reload, phones answer the host coming back while the game's code is
   * still loading, and those answers would otherwise be lost.
   */
  private backlog: HostRoomEvent[] = [];
  private current: HostRoomApi | null = null;

  constructor() {
    this.socket = new SocketClient({
      onOpen: (send) => this.keeper.announce(send),
      onMessage: (message) => this.onMessage(message),
      onStatus: (status) => this.onStatus(status),
    });
    this.keeper = new RoomKeeper(() => this.socket.redial(), {
      opened: (room) => this.onOpened(room),
      lost: (error) => this.goHome(error),
    });
    // A reload resumes its room. Creating another meanwhile would race it.
    useHostStore.setState({ resuming: this.keeper.holding });
  }

  private readonly unlockOnTap = () => {
    void this.audio.unlock().then(() => {
      if (this.audio.unlocked) window.removeEventListener("pointerdown", this.unlockOnTap);
    });
  };

  /**
   * Made on first use and again after `dispose`, because React mounts the
   * app twice in development and the first unmount closes the context.
   */
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
    this.socket.connect();
  }

  dispose(): void {
    window.removeEventListener("pointerdown", this.unlockOnTap);
    this.socket.close();
    this.engine?.close();
    this.engine = null;
  }

  /** Runs inside the Play click, which is also what lets the browser start sound. */
  async create(game: string, seats: number): Promise<void> {
    await this.audio.unlock();
    this.keeper.create((message) => this.socket.send(message), game, seats);
  }

  /** Ends the room for everyone and goes back to the home screen. */
  leave(): void {
    this.keeper.close((message) => this.socket.send(message));
    this.goHome(null);
  }

  private goHome(error: string | null): void {
    this.current = null;
    this.listeners.clear();
    this.backlog = [];
    useHostStore.setState({ screen: "home", room: null, players: [], playing: false, resuming: false, error });
  }

  private onStatus(status: SocketStatus): void {
    useHostStore.setState({ status });
    // Another tab resumed this room. This one steps back rather than play to nobody.
    if (status === "replaced") return this.goHome(null);
    this.emit({ type: "online", online: status === "open" });
  }

  private onOpened({ code, joinUrl, game, seats, connected, names }: OpenedRoom): void {
    const state = useHostStore.getState();
    // The room already on screen means the socket reconnected or moved,
    // not a page reload. The game keeps running and is told to resync.
    const same = connected !== null && state.room?.code === code;
    const players = Array.from({ length: seats }, (_, i): Player => ({
      seat: i + 1,
      // The relay keeps every name, so even a reloaded host has them at once.
      name: names?.[i] || (same && state.players[i]?.name) || defaultName(i + 1),
      connected: connected?.[i] ?? false,
    }));
    if (!same) {
      this.listeners.clear();
      this.backlog = [];
      this.current = this.makeApi(code, seats);
    }
    useHostStore.setState({ screen: "room", room: { code, joinUrl, game, seats }, players, resuming: false, error: null });
    if (same) {
      this.emit({ type: "players" });
      this.emit({ type: "resync" });
    }
    this.sharePlayers();
  }

  private onMessage(message: ServerEnvelope): void {
    switch (message.type) {
      case "room:created":
      case "room:resumed":
      case "room:error":
        return this.keeper.handle(message);
      case "peer:joined":
        this.updatePlayer(message.seat, { connected: true, ...(message.name ? { name: message.name } : {}) });
        return this.emit({ type: "joined", seat: message.seat, rejoined: message.rejoined });
      case "peer:left":
        this.updatePlayer(message.seat, { connected: false });
        return this.emit({ type: "left", seat: message.seat });
      case "peer:message":
        return this.onPhone(message.seat, message.payload);
    }
  }

  private onPhone(seat: Seat, payload: Payload): void {
    if (!reserved.has(payload.kind)) return this.emit({ type: "message", seat, payload });
    const profile = profileSchema.safeParse(payload);
    if (!profile.success) return;
    // The relay keeps names unique. A stale phone repeating someone else's name is ignored.
    const key = nameKey(profile.data.name);
    const clash = useHostStore.getState().players.some((player) => player.seat !== seat && nameKey(player.name) === key);
    if (!clash) this.updatePlayer(seat, { name: profile.data.name });
  }

  private updatePlayer(seat: Seat, change: Partial<Player>): void {
    const players = useHostStore.getState().players.map((player) => (player.seat === seat ? { ...player, ...change } : player));
    useHostStore.setState({ players });
    this.emit({ type: "players" });
    this.sharePlayers();
  }

  /** Every phone gets the line up, so games can show who they are up against. */
  private sharePlayers(): void {
    this.send("all", { kind: "players", players: useHostStore.getState().players });
  }

  private send(to: Seat | "all", payload: Payload): void {
    this.socket.send({ type: "host:send", to, payload });
  }

  private emit(event: HostRoomEvent): void {
    if (this.listeners.size === 0) {
      if (event.type === "message" && this.backlog.length < BACKLOG_MAX) this.backlog.push(event);
      return;
    }
    for (const listener of [...this.listeners]) listener(event);
  }

  private subscribe(listener: (event: HostRoomEvent) => void): () => void {
    this.listeners.add(listener);
    // A game usually subscribes several parts at once, so the backlog
    // goes out once they have all had the chance to listen.
    if (this.backlog.length > 0) {
      queueMicrotask(() => {
        const waiting = this.backlog;
        this.backlog = [];
        for (const event of waiting) this.emit(event);
      });
    }
    return () => this.listeners.delete(listener);
  }

  private makeApi(code: string, seats: number): HostRoomApi {
    return createHostApi(code, seats, {
      audio: () => this.audio,
      subscribe: (listener) => this.subscribe(listener),
      send: (to, payload) => this.send(to, payload),
      leave: () => this.leave(),
      live: (api) => this.current === api,
    });
  }
}
