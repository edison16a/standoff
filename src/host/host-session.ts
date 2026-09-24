import type { StageFrame } from "@/game/frames";
import { SocketClient, type SocketStatus } from "@/net/socket-client";
import type { Slot } from "@/shared/players";
import type { ServerEnvelope } from "@/shared/protocol";
import { clampTuning, type Tuning } from "@/shared/tuning";
import { buildControllerState } from "./controller-state";
import { HostAudio } from "./host-audio";
import { sameHud, useHostStore } from "./host-store";
import { Lobby } from "./lobby";
import { lobbyScene } from "./lobby-scene";
import { MatchDriver } from "./match-driver";
import { PhoneDesk } from "./phone-desk";
import { PhoneLink } from "./phone-link";
import { RoomKeeper, type OpenedRoom } from "./room-keeper";

/**
 * The computer's side of a game. It keeps the socket to the server, the
 * lobby, the running match and the sound, and it is the referee: phones
 * send raw input and everything they see comes back from here.
 */
export class HostSession {
  private readonly socket: SocketClient;
  private readonly lobby = new Lobby();
  private readonly audio = new HostAudio(() => this.tuning);
  driver: MatchDriver | null = null;
  private readonly phones: PhoneLink;
  private readonly room: RoomKeeper;
  private readonly desk = new PhoneDesk(this.lobby, {
    driver: () => this.driver,
    backToLobby: () => this.backToLobby(),
    seatsChanged: () => this.onSeatsChanged(),
    lobbyChanged: () => this.lobbyChanged(),
    greet: (slot) => this.phones.send(slot, { kind: "tuning", tuning: this.tuning }),
  });

  constructor() {
    this.socket = new SocketClient({
      onOpen: (send) => this.room.announce(send),
      onMessage: (message) => this.onMessage(message),
      onStatus: (status) => this.onStatus(status),
    });
    this.phones = new PhoneLink(this.socket);
    this.room = new RoomKeeper(() => this.socket.redial(), {
      opened: (room) => this.onRoomOpened(room),
      lost: (error) => this.leaveRoom(error),
    });
    // A reload resumes its room. Creating another meanwhile would race it.
    useHostStore.setState({ resuming: this.room.holding });
  }

  private get tuning(): Tuning {
    return useHostStore.getState().tuning;
  }

  connect(): void {
    this.socket.connect();
  }

  dispose(): void {
    this.audio.dispose();
    this.socket.close();
  }

  /** Runs inside the "Create game" click, which is also what unlocks audio. */
  async createGame(): Promise<void> {
    await this.audio.unlock();
    this.room.create((message) => this.socket.send(message));
  }

  /** Ends the room for everyone and returns to the start screen. */
  endGame(): void {
    this.room.close((message) => this.socket.send(message));
    this.leaveRoom(null);
  }

  /** Back to the start screen with no match, seats or sound left from the old room. */
  private leaveRoom(error: string | null): void {
    this.driver = null;
    this.lobby.seats = new Lobby().seats;
    this.audio.director?.stop();
    this.phones.forget();
    useHostStore.setState({ screen: "landing", room: null, hud: null, seats: this.lobby.seats, resuming: false, error });
  }

  /** Leaves a finished match for character select, keeping the room. */
  backToLobby(): void {
    this.driver = null;
    this.lobby.clearReady();
    this.audio.director?.onPhase("lobby");
    useHostStore.setState({ screen: "lobby", hud: null, seats: this.lobby.seats });
    this.broadcastState();
  }

  /** Puts the computer in the empty seat, or sends it away to make room for a person. */
  setSolo(on: boolean): void {
    if (this.driver) return;
    this.lobby.setComputer(on);
    this.lobbyChanged();
  }

  setTuning(next: Tuning): void {
    const tuning = clampTuning(next);
    useHostStore.setState({ tuning });
    this.audio.director?.applyLevels();
    this.phones.send("all", { kind: "tuning", tuning });
  }

  /** What the stage should draw right now: the match, or the lobby line up. */
  scene(wallNow: number): StageFrame {
    return this.driver ? this.driver.engine.scene() : lobbyScene(this.lobby.seats, wallNow);
  }

  /** Called every animation frame while the stage is up. */
  tick(wallNow: number): void {
    if (!this.driver) return;
    this.driver.tick(wallNow);
    const hud = this.driver.hud();
    if (!sameHud(hud, useHostStore.getState().hud)) useHostStore.setState({ hud });
    this.broadcastState();
  }

  private onStatus(status: SocketStatus): void {
    useHostStore.setState({ status });
    // Another tab resumed this room. This one stops rather than play to nobody.
    if (status === "replaced") return this.leaveRoom(null);
    // Phones hear nothing while the host is offline, so the exchange waits.
    if (status !== "open") this.driver?.engine.setConnected({ 1: false, 2: false });
  }

  private onRoomOpened({ code, joinUrl, sharedRooms, connected }: OpenedRoom): void {
    // Resuming the room already on screen means the socket reconnected or
    // moved, not a page reload. Keep whatever screen and match are running.
    const same = connected !== null && useHostStore.getState().room?.code === code;
    if (!same) this.leaveRoom(null);
    useHostStore.setState({ sharedRooms, resuming: false });
    connected?.forEach((on, i) => {
      const slot = (i + 1) as Slot;
      if (on) this.desk.seat(slot, false);
      else if (!this.lobby.seats[slot].computer) this.lobby.disconnect(slot);
    });
    if (!same) return this.enterLobby(code, joinUrl);
    // A phone may have joined while we were away and still have defaults.
    this.phones.send("all", { kind: "tuning", tuning: this.tuning });
    this.onSeatsChanged();
  }

  private onMessage(message: ServerEnvelope): void {
    switch (message.type) {
      case "room:created":
      case "room:resumed":
      case "room:error":
        this.room.handle(message);
        return;
      case "peer:joined":
        return this.desk.joined(message.slot, message.rejoined);
      case "peer:left":
        return this.desk.left(message.slot);
      case "peer:message":
        return this.desk.message(message.slot, message.payload);
    }
  }

  /** Picks or ready flags changed. Starts the match once everyone is set. */
  private lobbyChanged(): void {
    this.syncSeats();
    if (this.lobby.canStart && !this.driver) this.startMatch();
    this.broadcastState();
  }

  private startMatch(): void {
    this.driver = new MatchDriver(this.lobby.picks, () => this.tuning, {
      director: this.audio.director,
      feedback: (slot, event) => this.phones.send(slot, { kind: "feedback", event }),
      recenter: () => this.phones.send("all", { kind: "recenter" }),
      onPhase: () => this.broadcastState(),
    }, this.lobby.computerSlot);
    useHostStore.setState({ screen: "match" });
    this.driver.start();
  }

  private enterLobby(code: string, joinUrl: string): void {
    useHostStore.setState({ screen: "lobby", room: { code, joinUrl }, error: null });
    this.syncSeats();
    this.audio.ensure();
    this.audio.director?.onPhase("lobby");
    this.phones.send("all", { kind: "tuning", tuning: this.tuning });
    this.broadcastState();
  }

  /** Someone came or went. Pause or resume play and bring every screen up to date. */
  private onSeatsChanged(): void {
    this.syncSeats();
    this.driver?.engine.setConnected({ 1: this.lobby.seats[1].connected, 2: this.lobby.seats[2].connected });
    this.phones.forget();
    this.broadcastState();
  }

  private syncSeats(): void {
    useHostStore.setState({ seats: { 1: { ...this.lobby.seats[1] }, 2: { ...this.lobby.seats[2] } } });
  }

  /** Sends the phones their screen state, but only when it actually changed. */
  private broadcastState(): void {
    this.phones.sendState(buildControllerState(this.lobby, this.driver?.engine ?? null));
  }
}
