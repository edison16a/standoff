import { createStore } from "zustand/vanilla";
import { AudioEngine } from "@/platform/audio/audio-engine";
import { RESERVED_KINDS, type PhoneRoomApi } from "@/platform/games/game-api";
import { SocketClient, type SocketHandlers } from "@/platform/net/socket-client";
import type { ClientEnvelope, JoinErrorReason, Payload, ServerEnvelope } from "@/platform/protocol";
import { JoinRequest } from "@/platform/phone/join-request";
import { createPhoneApi } from "@/platform/phone/phone-api";
import { PhoneEvents } from "@/platform/phone/phone-events";
import { writeToken } from "@/platform/phone/seat-token";

/** The name the keyboard seat asks for first. "Keyboard 2" and on if a real player has it. */
export const KEYBOARD_NAME = "Keyboard";
const NAME_TRIES = 6;
const RETRY_MS = 1500;
const RETRIES = 5;

export type VirtualStage = "joining" | "playing" | "full" | "closed" | "failed";

export interface VirtualState {
  stage: VirtualStage;
  seat: number | null;
  name: string;
  game: string | null;
}

/** The socket as the virtual phone uses it. */
export interface PhoneLink {
  connect(): void;
  send(message: ClientEnvelope): void;
  sendLossy(message: ClientEnvelope): void;
  redial(): void;
  close(): void;
}

export interface VirtualPhoneOptions {
  /** Every game message the host sends this phone, for the keyboard binding's `last`. */
  onHost?(payload: Payload): void;
  /** The socket. A test passes a fake. */
  link?: (handlers: SocketHandlers) => PhoneLink;
  /** The screen's sound. A test passes a stand in. */
  audio?: () => AudioEngine;
}

const reserved = new Set<string>(RESERVED_KINDS);

/**
 * A phone that lives in the host's own tab. It joins the room through the
 * relay like any phone, so the relay counts its seat and the host meets
 * it through the usual joined, profile and players path, and real phones
 * joining at the same time take the other seats. The game's phone screen
 * gets `api`. The keyboard binding sends through `send`, as the same seat.
 */
export class VirtualPhone {
  readonly store = createStore<VirtualState>(() => ({ stage: "joining", seat: null, name: KEYBOARD_NAME, game: null }));
  private readonly link: PhoneLink;
  private readonly events = new PhoneEvents();
  private readonly request: JoinRequest;
  private readonly makeAudio: () => AudioEngine;
  private audio: AudioEngine | null = null;
  private current: PhoneRoomApi | null = null;
  /** Kinds the keyboard sends instead of the phone screen. */
  private replaced: readonly string[] = [];
  private tries = 1;
  private retries = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly code: string,
    private readonly options: VirtualPhoneOptions = {},
  ) {
    this.makeAudio = options.audio ?? (() => new AudioEngine());
    this.request = new JoinRequest(code, KEYBOARD_NAME);
    const makeLink = options.link ?? ((handlers: SocketHandlers) => new SocketClient(handlers));
    this.link = makeLink({
      onOpen: (send) => send(this.request.message()),
      onMessage: (message) => this.onMessage(message),
      onStatus: () => undefined,
    });
  }

  /** For the game's phone screen. Null until seated. */
  get api(): PhoneRoomApi | null {
    return this.current;
  }

  start(): void {
    this.link.connect();
  }

  /** The screen's own messages of these kinds are dropped, so a resting on screen stick never fights the keys. */
  replace(kinds: readonly string[]): void {
    this.replaced = [...kinds];
  }

  /** Sends as this seat, for the keyboard binding. Nothing goes before the seat is taken. */
  send(payload: Payload, lossy = false): void {
    if (!this.current) return;
    const message: ClientEnvelope = { type: "phone:send", payload };
    if (lossy) this.link.sendLossy(message);
    else this.link.send(message);
  }

  /** Closing the socket is how a phone leaves: the relay tells the host the seat left. */
  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.link.close();
    this.audio?.close();
    this.audio = null;
  }

  private onMessage(message: ServerEnvelope): void {
    switch (message.type) {
      case "phone:joined":
        return this.seated(message);
      case "room:error":
        return this.refused(message.reason);
      case "room:closed":
      case "room:moved":
        // The host page follows its own new room and seats a new keyboard player there.
        return this.stop("closed");
      case "host:back":
        // A room made again on another server instance asks every phone to sit again.
        if (message.rejoin) this.link.send(this.request.message());
        this.profile();
        return this.events.emit({ type: "rejoined" });
      case "host:message":
        if (reserved.has(message.payload.kind)) return;
        this.options.onHost?.(message.payload);
        return this.events.emit({ type: "message", payload: message.payload });
    }
  }

  private seated(message: Extract<ServerEnvelope, { type: "phone:joined" }>): void {
    this.retries = 0;
    writeToken(this.code, message.token);
    this.request.seated(message.name);
    const first = this.current === null;
    if (first) this.current = this.makeApi(message.seat, message.seats);
    this.store.setState({ stage: "playing", seat: message.seat, name: message.name, game: message.game });
    this.profile();
    if (!first) this.events.emit({ type: "rejoined" });
  }

  private refused(reason: JoinErrorReason): void {
    if (reason === "full") return this.stop("full");
    if (reason === "name-away") {
      // Our own seat from before, kept for us while away. Take it back.
      this.request.reconnect = true;
      return this.link.redial();
    }
    if (reason === "name-taken" || reason === "no-seat") {
      if (this.tries >= NAME_TRIES) return this.stop("failed");
      this.tries += 1;
      this.request.name = `${KEYBOARD_NAME} ${this.tries}`;
      this.request.reconnect = false;
      this.store.setState({ name: this.request.name });
      return this.link.redial();
    }
    if (reason !== "unavailable" || this.retries >= RETRIES) return this.stop(reason === "closed" ? "closed" : "failed");
    this.retries += 1;
    this.timer = setTimeout(() => this.link.redial(), RETRY_MS);
  }

  private stop(stage: VirtualStage): void {
    this.store.setState({ stage });
    this.link.close();
  }

  private profile(): void {
    this.link.send({ type: "phone:send", payload: { kind: "profile", name: this.store.getState().name } });
  }

  private makeApi(seat: number, seats: number): PhoneRoomApi {
    // The screen's own sends of a kind the keyboard took over are dropped.
    const fromScreen = (lossy: boolean) => (payload: Payload) => {
      if (!this.replaced.includes(payload.kind)) this.send(payload, lossy);
    };
    this.audio ??= this.makeAudio();
    return createPhoneApi({
      code: this.code,
      seat,
      seats,
      audio: this.audio,
      // No sensors here, so every game shows its buttons or drag pad.
      motion: () => "unavailable",
      send: fromScreen(false),
      sendLossy: fromScreen(true),
      on: (listener) => this.events.on(listener),
    });
  }
}
