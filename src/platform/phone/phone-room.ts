import { AudioEngine } from "@/platform/audio/audio-engine";
import { RESERVED_KINDS, type PhoneRoomApi, type PhoneRoomEvent } from "@/platform/games/game-api";
import { SocketClient } from "@/platform/net/socket-client";
import { defaultName, saveName } from "@/platform/profile";
import { playersSchema, type Payload, type ServerEnvelope } from "@/platform/protocol";
import { requestMotion } from "./permissions";
import { usePhoneStore as store } from "./phone-store";
import { ScreenAwake } from "./screen-awake";
import { readToken, writeToken } from "./seat-token";

/** Fresh sockets to try when a join cannot find the room. */
const JOIN_RETRIES = 6;
const reserved = new Set<string>(RESERVED_KINDS);
/** Host messages kept while the game is still loading. The newest matter most. */
const BACKLOG_LIMIT = 50;

/**
 * The phone's side of the platform: joining the room, keeping the seat
 * through reconnects, and telling the host this player's name. Once
 * seated it hands the game a PhoneRoomApi, and everything else is the
 * game's business.
 */
export class PhoneRoom {
  private readonly socket: SocketClient;
  private readonly awake = new ScreenAwake();
  private readonly listeners = new Set<(event: PhoneRoomEvent) => void>();
  private audio: AudioEngine | null = null;
  private motion: PhoneRoomApi["motion"] = "unavailable";
  private joinRetries = 0;
  private current: PhoneRoomApi | null = null;
  private backlog: PhoneRoomEvent[] = [];

  constructor(private readonly code: string) {
    this.socket = new SocketClient({
      onOpen: (send) => send({ type: "phone:join", code: this.code, token: readToken(this.code) ?? undefined }),
      onMessage: (message) => this.onMessage(message),
      onStatus: (status) => store.setState(status === "replaced" ? { status, stage: "error", error: "replaced" } : { status }),
    });
  }

  /** The room as the game sees it, once seated. */
  get api(): PhoneRoomApi | null {
    return this.current;
  }

  /**
   * The Join tap. Everything a browser only allows inside a tap happens
   * here at once: sound, motion access on iOS, and keeping the screen on.
   */
  async join(name: string | null): Promise<void> {
    // Skipping the name keeps whatever was saved before, and the seat number stands in for it.
    if (name) saveName(name);
    store.setState({ name: name ?? "", stage: "joining" });
    this.audio = new AudioEngine();
    void this.audio.unlock();
    this.motion = await requestMotion();
    void this.awake.start();
    this.socket.connect();
  }

  dispose(): void {
    this.awake.stop();
    this.socket.close();
    this.audio?.close();
  }

  private onMessage(message: ServerEnvelope): void {
    switch (message.type) {
      case "phone:joined": {
        this.joinRetries = 0;
        writeToken(this.code, message.token);
        const first = this.current === null;
        if (first) this.current = this.makeApi(message.seat, message.seats);
        if (!store.getState().name) store.setState({ name: defaultName(message.seat) });
        store.setState({ stage: "playing", seat: message.seat, game: message.game, error: null, hostAway: !message.hostHere });
        this.sendProfile();
        if (!first) this.emit({ type: "rejoined" });
        return;
      }
      case "room:error": {
        // Without a shared room store, a socket can land on a server
        // instance that has never heard of the room, and a server side
        // failure may pass. Either way, try a few fresh sockets.
        const retry = message.reason === "not-found" || message.reason === "unavailable";
        if (retry && this.joinRetries < JOIN_RETRIES) {
          this.joinRetries += 1;
          this.socket.redial();
          return;
        }
        store.setState({ stage: "error", error: message.reason });
        return;
      }
      case "room:closed":
        store.setState({ stage: "error", error: "closed" });
        this.dispose();
        return;
      case "host:away":
        store.setState({ hostAway: true });
        return;
      case "host:back":
        store.setState({ hostAway: false });
        this.sendProfile();
        this.emit({ type: "rejoined" });
        return;
      case "host:message":
        return this.onHost(message.payload);
    }
  }

  private onHost(payload: Payload): void {
    if (!reserved.has(payload.kind)) return this.emit({ type: "message", payload });
    const players = playersSchema.safeParse(payload);
    if (players.success) store.setState({ players: players.data.players });
  }

  /** The host learns names from the phones, so it hears again after every reconnect. */
  private sendProfile(): void {
    this.send({ kind: "profile", name: store.getState().name });
  }

  private send(payload: Payload): void {
    this.socket.send({ type: "phone:send", payload });
  }

  /**
   * The game loads after the phone is seated, and the host starts talking
   * straight away. Until the game listens, messages wait here.
   */
  private emit(event: PhoneRoomEvent): void {
    if (this.listeners.size === 0) {
      this.backlog = [...this.backlog, event].slice(-BACKLOG_LIMIT);
      return;
    }
    for (const listener of [...this.listeners]) listener(event);
  }

  private makeApi(seat: number, seats: number): PhoneRoomApi {
    return {
      code: this.code,
      seat,
      seats,
      audio: this.audio ?? new AudioEngine(),
      motion: this.motion,
      send: (payload) => this.send(payload),
      sendLossy: (payload) => this.socket.sendLossy({ type: "phone:send", payload }),
      on: (listener) => {
        this.listeners.add(listener);
        const waiting = this.backlog;
        this.backlog = [];
        queueMicrotask(() => waiting.forEach(listener));
        return () => this.listeners.delete(listener);
      },
    };
  }
}
