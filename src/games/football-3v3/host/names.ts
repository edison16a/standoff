import { playerColor } from "@/games/kit/players";
import type { Player } from "@/platform/games/game-api";
import { computerName } from "../builds";
import type { Match } from "../engine/match";

/** A tag over a player on the field: a phone's player by name in their colour. */
export interface Tag {
  name: string;
  colour: string;
}

/**
 * Who each player is on screen. A phone's player is the name they typed,
 * on their jersey, their tag and every line of text; a computer player
 * is "CPU" and its build, and wears no name.
 */
export class Names {
  constructor(
    private readonly match: () => Match | null,
    private readonly players: () => readonly Player[],
  ) {}

  /** A phone's player's own name; null for the computer's. */
  own(id: number): string | null {
    const a = this.match()?.athlete(id);
    if (!a || a.seat === null) return null;
    return this.players().find((p) => p.seat === a.seat)?.name ?? null;
  }

  /** How a player is called out: their own name, or "CPU" and the build. */
  called(id: number): string {
    const a = this.match()?.athlete(id);
    if (!a?.build) return "";
    return this.own(id) ?? computerName(a.build);
  }

  /**
   * The tag over the player a phone steers, or null for the computer's.
   * It is the only place names show in play, so a dropped phone says so
   * on the tag, and it moves with the phone to a teammate it passed to.
   */
  tag(id: number): Tag | null {
    const a = this.match()?.athlete(id);
    const seat = a?.pilot ?? null;
    if (!a || seat === null) return null;
    const name = this.players().find((p) => p.seat === seat)?.name ?? this.called(id);
    return { name: a.auto ? `${name} (CPU)` : name, colour: playerColor(seat) };
  }
}
