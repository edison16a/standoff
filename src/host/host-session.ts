import { AudioEngine } from "@/audio/audio-engine";
import { SoundDirector } from "@/audio/sound-director";
import { SocketClient } from "@/net/socket-client";
import type { Slot } from "@/shared/players";
import type { HostMessage, PhoneMessage, ServerEnvelope } from "@/shared/protocol";
import { clampTuning, type Tuning } from "@/shared/tuning";
import { buildControllerState } from "./controller-state";
import { sameHud, useHostStore } from "./host-store";
import { Lobby } from "./lobby";
import { MatchDriver } from "./match-driver";
import { forgetRoom, recallRoom, rememberRoom } from "./room-memory";

/**
 * The computer's side of a game. It keeps the socket to the server, the
 * lobby, the running match and the sound, and it is the referee: phones
 * send raw input and everything they see comes back from here.
 */
export class HostSession {
  private readonly socket: SocketClient;
  private readonly lobby = new Lobby();
  private audio: AudioEngine | null = null;
  private director: SoundDirector | null = null;
  driver: MatchDriver | null = null;
  private wantsRoom = false;
  private lastState = "";

  constructor() {
    this.socket = new SocketClient({
      onOpen: () => this.announce(),
      onMessage: (message) => this.onMessage(message),
      onStatus: (status) => useHostStore.setState({ status }),
    });
  }

  private get tuning(): Tuning {
    return useHostStore.getState().tuning;
  }

  connect(): void {
    this.socket.connect();
  }

  dispose(): void {
    this.director?.stop();
    this.audio?.close();
    this.socket.close();
  }

  /** Runs inside the "Create game" click, which is also what unlocks audio. */
  async createGame(): Promise<void> {
    this.ensureAudio();
    await this.audio?.unlock();
    this.wantsRoom = true;
    this.socket.send({ type: "host:create" });
  }

  /** Ends the room for everyone and returns to the start screen. */
  endGame(): void {
    this.socket.send({ type: "host:close" });
    forgetRoom();
    this.driver = null;
    this.wantsRoom = false;
    this.lobby.seats = new Lobby().seats;
    this.director?.onPhase("lobby");
    useHostStore.setState({ screen: "landing", room: null, hud: null, seats: this.lobby.seats });
  }

  /** Leaves a finished match for character select, keeping the room. */
  backToLobby(): void {
    this.driver = null;
    this.lobby.clearReady();
    this.director?.onPhase("lobby");
    useHostStore.setState({ screen: "lobby", hud: null, seats: this.lobby.seats });
    this.broadcastState();
  }

  setTuning(next: Tuning): void {
    const tuning = clampTuning(next);
    useHostStore.setState({ tuning });
    this.director?.applyLevels();
    this.send("all", { kind: "tuning", tuning });
  }

  /** Called every animation frame while the match screen is up. */
  tick(wallNow: number): void {
    if (!this.driver) return;
    this.driver.tick(wallNow);
    const hud = this.driver.hud();
    if (!sameHud(hud, useHostStore.getState().hud)) useHostStore.setState({ hud });
    this.broadcastState();
  }

  private announce(): void {
    const saved = recallRoom();
    if (saved) this.socket.send({ type: "host:resume", code: saved.code, token: saved.token });
    else if (this.wantsRoom) this.socket.send({ type: "host:create" });
  }

  private onMessage(message: ServerEnvelope): void {
    switch (message.type) {
      case "room:created":
        rememberRoom({ code: message.code, token: message.token });
        this.enterLobby(message.code, message.joinUrl);
        return;
      case "room:resumed":
        message.connected.forEach((on, i) => (on ? this.lobby.connect((i + 1) as Slot) : this.lobby.disconnect((i + 1) as Slot)));
        this.enterLobby(message.code, message.joinUrl);
        return;
      case "room:error":
        forgetRoom();
        useHostStore.setState({ screen: "landing", room: null, error: this.wantsRoom ? "Could not open a room. Try again." : null });
        return;
      case "peer:joined":
      case "peer:left":
        if (message.type === "peer:joined") this.lobby.connect(message.slot);
        else this.lobby.disconnect(message.slot);
        this.syncSeats();
        this.driver?.engine.setConnected({ 1: this.lobby.seats[1].connected, 2: this.lobby.seats[2].connected });
        if (message.type === "peer:joined") this.send(message.slot, { kind: "tuning", tuning: this.tuning });
        this.lastState = "";
        this.broadcastState();
        return;
      case "peer:message":
        this.onPhone(message.slot, message.payload);
        return;
    }
  }

  private onPhone(slot: Slot, message: PhoneMessage): void {
    const engine = this.driver?.engine;
    switch (message.kind) {
      case "motion":
        engine?.control(slot, message);
        return;
      case "strike":
        engine?.strike(slot, message.action);
        return;
      case "skip":
        engine?.skip(slot);
        this.director?.sfx.click();
        return;
      case "rematch":
        engine?.rematch(slot);
        return;
      case "pick":
        if (!this.driver) this.lobby.pick(slot, message.characterId);
        break;
      case "ready":
        if (!this.driver) this.lobby.setReady(slot, message.ready);
        break;
    }
    this.syncSeats();
    if (this.lobby.canStart && !this.driver) this.startMatch();
    this.broadcastState();
  }

  private startMatch(): void {
    this.driver = new MatchDriver(this.lobby.picks, () => this.tuning, {
      director: this.director,
      feedback: (slot, event) => this.send(slot, { kind: "feedback", event }),
      recenter: () => this.send("all", { kind: "recenter" }),
      onPhase: () => this.broadcastState(),
    });
    useHostStore.setState({ screen: "match" });
    this.driver.start();
  }

  private enterLobby(code: string, joinUrl: string): void {
    useHostStore.setState({ screen: "lobby", room: { code, joinUrl }, error: null });
    this.syncSeats();
    this.ensureAudio();
    this.director?.onPhase("lobby");
    this.send("all", { kind: "tuning", tuning: this.tuning });
    this.broadcastState();
  }

  private ensureAudio(): void {
    if (this.audio) return;
    const audio = new AudioEngine();
    this.audio = audio;
    this.director = new SoundDirector(audio, () => this.tuning);
    // After a reload there was no click yet, so audio waits for the first one.
    if (!audio.unlocked) window.addEventListener("pointerdown", () => void audio.unlock(), { once: true });
  }

  private syncSeats(): void {
    useHostStore.setState({ seats: { 1: { ...this.lobby.seats[1] }, 2: { ...this.lobby.seats[2] } } });
  }

  /** Sends the phones their screen state, but only when it actually changed. */
  private broadcastState(): void {
    const state = buildControllerState(this.lobby, this.driver?.engine ?? null);
    const serialized = JSON.stringify(state);
    if (serialized === this.lastState) return;
    this.lastState = serialized;
    this.send("all", state);
  }

  private send(to: Slot | "all", payload: HostMessage): void {
    this.socket.send({ type: "host:send", to, payload });
  }
}
