import { registerAdminActions, type AdminAction } from "@/platform/admin/admin-actions";
import { Pilot } from "./pilot";
import type { Round } from "./round";

/**
 * The host's hidden admin shortcuts while a round runs: an autopilot for
 * each player, so one tester can play a 1v1 race alone. They are listed
 * from the start of a round until its results show or the game closes.
 */
export class RoundAdmin {
  private round: Round | null = null;
  private readonly pilots = new Map<number, Pilot>();
  private unregister: (() => void) | null = null;

  begin(round: Round): void {
    this.end();
    this.round = round;
    this.publish();
  }

  /** Presses for every player on autopilot. Call it each frame before the round moves on. */
  tick(): void {
    const round = this.round;
    if (!round) return;
    for (const [slot, pilot] of this.pilots) {
      const seat = round.seats[slot - 1];
      if (!seat) continue;
      for (const at of pilot.due(round.levelTime(slot), seat.run.time)) round.press(slot, seat.offset + at);
    }
  }

  end(): void {
    this.unregister?.();
    this.unregister = null;
    this.round = null;
    this.pilots.clear();
  }

  toggle(slot: number): void {
    if (!this.round) return;
    if (this.pilots.has(slot)) this.pilots.delete(slot);
    else this.pilots.set(slot, new Pilot(this.round.level));
    this.publish();
  }

  private publish(): void {
    const round = this.round;
    if (!round) return;
    const actions: AdminAction[] = round.seats.map((_, i) => {
      const slot = i + 1;
      const who = round.solo ? "" : ` for player ${slot}`;
      const label = `${this.pilots.has(slot) ? "Stop autopilot" : "Autopilot"}${who}`;
      return { id: `autopilot-${slot}`, label, run: () => this.toggle(slot) };
    });
    // Registering again replaces the group, so the button text follows the toggle.
    this.unregister = registerAdminActions("cube-game", actions);
  }
}
