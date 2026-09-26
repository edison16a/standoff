import type { SwordControl } from "@/games/blade-clash/engine/sword";
import type { Slot } from "@/games/blade-clash/players";
import type { CalibrationStep, PhoneMessage } from "@/games/blade-clash/protocol";
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
  /** A phone moved on to another calibration target. */
  calibrating(slot: Slot, step: CalibrationStep | null): void;
  /** How a phone holds its sword in the lobby, for the fighter on the big screen. */
  hold(slot: Slot, control: SwordControl): void;
}

/**
 * Phones as the host hears them: arriving, leaving, and what they send.
 * During a match the sword and the rematch go to the driver. Before it,
 * lobby choices count, and the sword moves the fighter on its mark.
 */
export class PhoneDesk {
  constructor(
    private readonly lobby: Lobby,
    private readonly session: DeskSession,
  ) {}

  joined(slot: Slot, rejoined: boolean): void {
    this.seat(slot, !rejoined);
    this.session.seatsChanged();
  }

  left(slot: Slot): void {
    this.lobby.disconnect(slot);
    this.session.calibrating(slot, null);
    this.session.seatsChanged();
  }

  message(slot: Slot, message: PhoneMessage): void {
    if (message.kind === "calibrate") return this.session.calibrating(slot, message.step === "done" ? null : message.step);
    if (message.kind === "menu") return this.session.backToLobby();
    const driver = this.session.driver();
    if (driver) return driver.input(slot, message);
    if (message.kind === "motion") return this.session.hold(slot, message);
    if (message.kind === "pick") this.lobby.pick(slot, message.characterId);
    else if (message.kind === "ready") this.lobby.setReady(slot, message.ready);
    else if (message.kind === "solo") this.lobby.setComputer(message.on);
    else return;
    this.session.lobbyChanged();
  }

  /**
   * A phone sat down. A real opponent takes over from the computer, and a
   * new phone in a seat someone left starts from scratch, even mid match,
   * so nobody plays on another player's fighter and calibration.
   */
  seat(slot: Slot, fresh: boolean): void {
    const replaced = this.lobby.unseatComputer(slot) || (fresh && this.lobby.clearSeat(slot));
    if (replaced && this.session.driver()) this.session.backToLobby();
    this.lobby.connect(slot);
  }
}
