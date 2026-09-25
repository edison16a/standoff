import type { Slot } from "@/games/blade-clash/players";
import type { PhoneMessage } from "@/games/blade-clash/protocol";
import type { Lobby } from "./lobby";
import type { MatchDriver } from "./match-driver";

/** What the desk needs from the host session. */
export interface DeskSession {
  driver(): MatchDriver | null;
  backToLobby(): void;
  /** Someone came or went. */
  seatsChanged(): void;
  /** A pick, ready flag or solo choice changed. */
  lobbyChanged(): void;
  /** Sends a newly seated phone what it needs before anything else. */
  greet(slot: Slot): void;
}

/**
 * Phones as the host hears them: arriving, leaving, and what they send.
 * During a match every input goes to the driver. Before it, only lobby
 * choices count.
 */
export class PhoneDesk {
  constructor(
    private readonly lobby: Lobby,
    private readonly session: DeskSession,
  ) {}

  joined(slot: Slot, rejoined: boolean): void {
    this.seat(slot, !rejoined);
    this.session.greet(slot);
    this.session.seatsChanged();
  }

  left(slot: Slot): void {
    this.lobby.disconnect(slot);
    this.session.seatsChanged();
  }

  message(slot: Slot, message: PhoneMessage): void {
    const driver = this.session.driver();
    if (driver) return driver.input(slot, message);
    if (message.kind === "pick") this.lobby.pick(slot, message.characterId);
    else if (message.kind === "ready") this.lobby.setReady(slot, message.ready);
    else if (message.kind === "solo") this.lobby.setComputer(message.on);
    else return;
    this.session.lobbyChanged();
  }

  /**
   * A phone sat down. A real opponent takes over from the computer, and a
   * new phone in a seat someone left starts from scratch, even mid match,
   * so nobody plays on another player's fencer and calibration.
   */
  seat(slot: Slot, fresh: boolean): void {
    const replaced = this.lobby.unseatComputer(slot) || (fresh && this.lobby.clearSeat(slot));
    if (replaced && this.session.driver()) this.session.backToLobby();
    this.lobby.connect(slot);
  }
}
