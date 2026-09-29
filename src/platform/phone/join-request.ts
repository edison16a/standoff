import type { ClientEnvelope, NameClash } from "@/platform/protocol";
import { readToken } from "./seat-token";

/** Tries a reconnect makes while the old tab's connection is still letting go of the seat. */
const TAKEN_RETRIES = 4;
export const TAKEN_RETRY_MS = 1500;

const CLASHES = new Set<string>(["name-taken", "name-away", "no-seat"]);

export function isNameClash(reason: string): reason is NameClash {
  return CLASHES.has(reason);
}

/**
 * What a phone says when it joins, and how it copes when the name is a
 * problem. Once seated, every later join is a reconnect as that same
 * player, so a dropped socket or a reload always lands back in the seat.
 */
export class JoinRequest {
  private takenRetries = 0;

  constructor(
    private readonly code: string,
    /** The unique name to join as. Null joins as the seat number. */
    public name: string | null = null,
    /** Take back this name's seat instead of making a new player. */
    public reconnect = false,
  ) {}

  message(): Extract<ClientEnvelope, { type: "phone:join" }> {
    return {
      type: "phone:join",
      code: this.code,
      token: readToken(this.code) ?? undefined,
      ...(this.name ? { name: this.name } : {}),
      ...(this.reconnect ? { reconnect: true } : {}),
    };
  }

  /** Seated under the name the relay settled on. */
  seated(name: string): void {
    this.name = name;
    this.reconnect = true;
    this.takenRetries = 0;
  }

  /**
   * A reconnect can arrive before the relay has noticed the old tab went,
   * when the name still looks taken. That is worth a few more tries, where
   * a clash on a first join goes straight back to the player.
   */
  retryTaken(reason: NameClash): boolean {
    if (reason !== "name-taken" || !this.reconnect || this.takenRetries >= TAKEN_RETRIES) return false;
    this.takenRetries += 1;
    return true;
  }
}
