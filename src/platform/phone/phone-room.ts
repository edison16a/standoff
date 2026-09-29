import { AudioEngine } from "@/platform/audio/audio-engine";
import { startAudioSoon } from "@/platform/audio/autoplay";
import { RESERVED_KINDS, type PhoneRoomApi, type PhoneRoomEvent } from "@/platform/games/game-api";
import { SocketClient } from "@/platform/net/socket-client";
import { defaultName, saveName } from "@/platform/profile";
import { playersSchema, type Payload, type ServerEnvelope } from "@/platform/protocol";
import { isNameClash, JoinRequest, TAKEN_RETRY_MS } from "./join-request";
import { requestMotion } from "./permissions";
import { createPhoneStore, type PhoneError } from "./phone-store";
import { ScreenAwake } from "./screen-awake";
import { rememberMove } from "./room-move";
import { writeToken } from "./seat-token";

/** Fresh sockets to try when a join cannot find the room. */
const JOIN_RETRIES = 6;
const reserved = new Set<string>(RESERVED_KINDS);
/** Host messages kept while the game is still loading. The newest matter most. */
const BACKLOG_LIMIT = 50;

/**
 * The phone's side of the platform: joining the room under a unique name,
 * keeping the seat through reconnects and reloads, and telling the host
 * this player's name. Once seated it hands the game a PhoneRoomApi, and
 * everything else is the game's business.
 */
export class PhoneRoom {
  /** This room's screens. A fresh room never starts where another one ended. */
  readonly store = createPhoneStore();
  private readonly socket: SocketClient;
  private readonly awake = new ScreenAwake();
  private readonly listeners = new Set<(event: PhoneRoomEvent) => void>();
  private readonly request: JoinRequest;
  private audio: AudioEngine | null = null;
  private stopAudioWait: (() => void) | null = null;
  private motion: PhoneRoomApi["motion"] = "unavailable";
  private joinRetries = 0;
  private current: PhoneRoomApi | null = null;
  private backlog: PhoneRoomEvent[] = [];
  private active = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly code: string,
    /** The player this page belongs to, from its address. Joining takes back their seat. */
    resumeAs: string | null = null,
  ) {
    this.request = new JoinRequest(code, resumeAs, resumeAs !== null);
    this.socket = new SocketClient({
      onOpen: (send) => send(this.request.message()),
      onMessage: (message) => this.onMessage(message),
      onStatus: (status) => this.store.setState(status === "replaced" ? { status, stage: "error", error: "replaced" } : { status }),
    });
  }

  /** The room as the game sees it, once seated. */
  get api(): PhoneRoomApi | null {
    return this.current;
  }

  /**
   * The Join tap. Everything a browser only allows inside a tap happens
   * here at once: sound, motion access on iOS, and keeping the screen on.
   * `reconnect` takes back the seat of the dropped player with this name.
   */
  async join(name: string | null, reconnect = false): Promise<void> {
    // Skipping the name keeps whatever was saved before, and the relay names the seat.
    if (name) saveName(name);
    this.request.name = name;
    this.request.reconnect = reconnect;
    this.store.setState({ name: name ?? "", stage: "joining", clash: null });
    this.audio ??= new AudioEngine();
    const audio = this.audio;
    // Inside the Join tap this starts sound at once. A phone moved to a new
    // room had no tap, so its sound waits for the next touch instead.
    this.stopAudioWait?.();
    this.stopAudioWait = startAudioSoon(audio.ctx, window, { resume: () => audio.unlock() });
    this.motion = await requestMotion();
    this.start();
  }

  /**
   * Straight back into the seat, with no tap, for a page opened at this
   * player's own address. Sound starts at the first touch instead.
   */
  resume(): void {
    if (this.active || !this.request.name) return;
    this.store.setState({ name: this.request.name, stage: "joining" });
    this.audio ??= new AudioEngine();
    const audio = this.audio;
    // A reload has no tap, so sound starts on the next touch.
    this.stopAudioWait?.();
    this.stopAudioWait = startAudioSoon(audio.ctx, window, { resume: () => audio.unlock() });
    // Without a tap iOS cannot grant motion, so a resume there goes through Join (see PhoneApp).
    void requestMotion().then((motion) => (this.motion = motion));
    this.start();
  }

  /** The Reconnect button: try a fresh connection now instead of waiting out the backoff. */
  reconnect(): void {
    if (this.active) this.socket.redial();
  }

  /** Safe to call twice: a room that ended is disposed again when its page goes. */
  dispose(): void {
    this.active = false;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.awake.stop();
    this.socket.close();
    this.stopAudioWait?.();
    this.audio?.close();
    this.audio = null;
  }

  /**
   * Shows the error and stops for good. A socket left open would rejoin a
   * dead room on every reconnect, and each miss counts against the join
   * limit that every phone on the same network shares.
   */
  fail(error: PhoneError): void {
    this.store.setState({ stage: "error", error });
    this.dispose();
  }

  private start(): void {
    this.active = true;
    void this.awake.start();
    this.socket.connect();
  }

  private onMessage(message: ServerEnvelope): void {
    switch (message.type) {
      case "phone:joined": {
        this.joinRetries = 0;
        writeToken(this.code, message.token);
        this.request.seated(message.name);
        const first = this.current === null;
        if (first) this.current = this.makeApi(message.seat, message.seats);
        this.store.setState({ stage: "playing", seat: message.seat, game: message.game, name: message.name, error: null, clash: null, hostAway: !message.hostHere });
        this.sendProfile();
        if (!first) this.emit({ type: "rejoined" });
        return;
      }
      case "room:error":
        return this.onJoinError(message.reason);
      case "room:closed":
        return this.fail("closed");
      case "room:moved":
        return this.moveTo(message.code);
      case "host:away":
        this.store.setState({ hostAway: true });
        return;
      case "host:back":
        this.store.setState({ hostAway: false });
        this.sendProfile();
        this.emit({ type: "rejoined" });
        return;
      case "host:message":
        return this.onHost(message.payload);
    }
  }

  /** The host remade its lobby. This page follows to the new room with the same name. */
  private moveTo(code: string): void {
    const { name, seat } = this.store.getState();
    const chosen = name && !(seat && name === defaultName(seat)) ? name : null;
    rememberMove({ code, name: chosen });
    this.store.setState({ stage: "joining", movedTo: code });
    this.dispose();
  }

  private onJoinError(reason: Extract<ServerEnvelope, { type: "room:error" }>["reason"]): void {
    if (isNameClash(reason)) {
      if (this.request.retryTaken(reason)) {
        this.retryTimer = setTimeout(() => this.socket.redial(), TAKEN_RETRY_MS);
        return;
      }
      // Back to the player to pick another name, or to reconnect as this one.
      this.active = false;
      this.socket.close();
      this.store.setState({ stage: "name", clash: { reason, name: this.request.name ?? "" } });
      return;
    }
    // Without a shared room store, a socket can land on a server instance
    // that has never heard of the room, and a server side failure may
    // pass. Either way, try a few fresh sockets.
    const retry = reason === "not-found" || reason === "unavailable";
    if (retry && this.joinRetries < JOIN_RETRIES) {
      this.joinRetries += 1;
      this.socket.redial();
      return;
    }
    this.fail(reason);
  }

  private onHost(payload: Payload): void {
    if (!reserved.has(payload.kind)) return this.emit({ type: "message", payload });
    const players = playersSchema.safeParse(payload);
    if (players.success) this.store.setState({ players: players.data.players });
  }

  /** The host learns names from the phones too, so it hears again after every reconnect. */
  private sendProfile(): void {
    this.send({ kind: "profile", name: this.store.getState().name });
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
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- motion may settle after the seat does
    const room = this;
    return {
      code: this.code,
      seat,
      seats,
      audio: this.audio ?? new AudioEngine(),
      get motion() {
        return room.motion;
      },
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
