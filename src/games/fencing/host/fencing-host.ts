import type { StageFrame } from "@/games/fencing/engine/frames";
import type { PerSlot, Slot } from "@/games/fencing/players";
import { phoneMessageSchema } from "@/games/fencing/protocol";
import { clampTuning, type Tuning } from "@/games/fencing/tuning";
import type { HostRoomApi, HostRoomEvent } from "@/platform/games/game-api";
import { buildControllerState } from "./controller-state";
import { HostAudio } from "./host-audio";
import { sameHud, useFencingStore } from "./host-store";
import { Lobby } from "./lobby";
import { lobbyScene } from "./lobby-scene";
import { MatchDriver } from "./match-driver";
import { PhoneDesk } from "./phone-desk";
import { PhoneLink } from "./phone-link";

/**
 * Fencing on the computer, for one room. It keeps the lobby, the running
 * match and the sound, and it is the referee: phones send raw input and
 * everything they see comes back from here. The room itself (connection,
 * seats, names) belongs to the platform, which hands it over as `room`.
 */
export class FencingHost {
  private readonly lobby = new Lobby();
  private readonly audio: HostAudio;
  driver: MatchDriver | null = null;
  private readonly phones: PhoneLink;
  private readonly desk: PhoneDesk;
  private readonly unsubscribe: () => void;

  constructor(private readonly room: HostRoomApi) {
    this.audio = new HostAudio(room.audio, () => this.tuning);
    this.phones = new PhoneLink(room);
    this.desk = new PhoneDesk(this.lobby, {
      driver: () => this.driver,
      backToLobby: () => this.backToLobby(),
      seatsChanged: () => this.onSeatsChanged(),
      lobbyChanged: () => this.lobbyChanged(),
      greet: (slot) => this.phones.send(slot, { kind: "tuning", tuning: this.tuning }),
    });
    // After a host reload the phones are already sitting in the room.
    for (const player of room.players()) if (player.connected) this.desk.seat(player.seat as Slot, false);
    this.unsubscribe = room.on((event) => this.onRoom(event));
    useFencingStore.setState({ hud: null, tuningOpen: false });
    this.audio.director.onPhase("lobby");
    this.phones.send("all", { kind: "tuning", tuning: this.tuning });
    this.syncSeats();
    this.broadcastState();
  }

  private get tuning(): Tuning {
    return useFencingStore.getState().tuning;
  }

  dispose(): void {
    this.unsubscribe();
    this.driver = null;
    this.audio.dispose();
    this.room.setPlaying(false);
  }

  /** Leaves a finished match for character select, keeping the room. */
  backToLobby(): void {
    this.driver = null;
    this.lobby.clearReady();
    this.audio.director.onPhase("lobby");
    this.room.setPlaying(false);
    useFencingStore.setState({ hud: null });
    this.syncSeats();
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
    useFencingStore.setState({ tuning });
    this.audio.director.applyLevels();
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
    if (!sameHud(hud, useFencingStore.getState().hud)) useFencingStore.setState({ hud });
    this.broadcastState();
  }

  private onRoom(event: HostRoomEvent): void {
    switch (event.type) {
      case "players":
        this.syncSeats();
        return this.broadcastState();
      case "joined":
        return this.desk.joined(event.seat as Slot, event.rejoined);
      case "left":
        return this.desk.left(event.seat as Slot);
      case "message": {
        const parsed = phoneMessageSchema.safeParse(event.payload);
        if (parsed.success) this.desk.message(event.seat as Slot, parsed.data);
        return;
      }
      case "online":
        // Phones hear nothing while the host is offline, so the exchange waits.
        if (!event.online) this.driver?.engine.setConnected({ 1: false, 2: false });
        return;
      case "resync":
        for (const player of this.room.players()) {
          const slot = player.seat as Slot;
          if (player.connected) this.desk.seat(slot, false);
          else if (!this.lobby.seats[slot].computer) this.lobby.disconnect(slot);
        }
        // A phone may have joined while we were away and still have defaults.
        this.phones.send("all", { kind: "tuning", tuning: this.tuning });
        return this.onSeatsChanged();
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
    this.room.setPlaying(true);
    this.driver.start();
  }

  /** Someone came or went. Pause or resume play and bring every screen up to date. */
  private onSeatsChanged(): void {
    this.syncSeats();
    this.driver?.engine.setConnected({ 1: this.lobby.seats[1].connected, 2: this.lobby.seats[2].connected });
    this.phones.forget();
    this.broadcastState();
  }

  /** The players' names, with the computer standing in for an empty seat. */
  private names(): PerSlot<string> {
    const players = this.room.players();
    const name = (slot: Slot) => (this.lobby.seats[slot].computer ? "Computer" : (players[slot - 1]?.name ?? `Player ${slot}`));
    return { 1: name(1), 2: name(2) };
  }

  private syncSeats(): void {
    const seats = { 1: { ...this.lobby.seats[1] }, 2: { ...this.lobby.seats[2] } };
    useFencingStore.setState({ seats, names: this.names() });
  }

  /** Sends the phones their screen state, but only when it actually changed. */
  private broadcastState(): void {
    const names = this.names();
    this.phones.sendState(buildControllerState(this.lobby, this.driver?.engine ?? null, [names[1], names[2]]));
  }
}
