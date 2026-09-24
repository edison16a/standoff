import type { Seat } from "@/platform/protocol";
import { Gun } from "./gun";
import { emptyStats, statLine, type PlayerStats, type StatLine } from "./stats";
import type { WeaponId } from "./weapons";

export interface Member {
  seat: Seat;
  gun: Gun;
  stats: PlayerStats;
  /** Connected right now. Absent players keep their gun and stats for when they return. */
  present: boolean;
}

/**
 * The players in a run. A player who leaves keeps their place, so coming
 * back mid game picks up where they were.
 */
export class Squad {
  private readonly members = new Map<Seat, Member>();

  /** Adds a player, or swaps their gun if they picked another one. */
  enlist(seat: Seat, weapon: WeaponId): Member {
    const existing = this.members.get(seat);
    if (existing) {
      if (existing.gun.weapon !== weapon) existing.gun = new Gun(weapon);
      existing.present = true;
      return existing;
    }
    const member = { seat, gun: new Gun(weapon), stats: emptyStats(), present: true };
    this.members.set(seat, member);
    return member;
  }

  /** Someone new took this seat: they start with their own gun and their own numbers. */
  release(seat: Seat): void {
    this.members.delete(seat);
  }

  get(seat: Seat): Member | undefined {
    return this.members.get(seat);
  }

  setPresent(seat: Seat, present: boolean): void {
    const member = this.members.get(seat);
    if (member) member.present = present;
  }

  all(): Member[] {
    return [...this.members.values()].sort((a, b) => a.seat - b.seat);
  }

  present(): Member[] {
    return this.all().filter((m) => m.present);
  }

  /** How many play right now, at least one so a lone reconnect still scales sensibly. */
  get size(): number {
    return Math.max(1, this.present().length);
  }

  refill(): void {
    for (const m of this.members.values()) m.gun.refill();
  }

  lines(): StatLine[] {
    return this.all().map((m) => statLine(m.seat, m.stats));
  }
}
