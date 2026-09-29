/**
 * How long a phone waits before trying a failed join again, and when it
 * stops. Rooms live in one server instance's memory, so a fresh socket
 * may land on the instance that has the room, and a few spaced tries are
 * worth it. Past them the phone says so plainly and shows the join field,
 * rather than retrying a dead room for ever.
 */

/**
 * A first join to a code nobody has. Each try may reach another server
 * instance, so a few are worth it, and a typo still shows in about 5 s.
 */
const FIRST_NOT_FOUND = [400, 800, 1600, 2400];
/** The server failed part way, which usually passes. */
const UNAVAILABLE = [500, 1000, 2000, 4000, 4000];
/** A phone that was seated in this room: about 9 s, then the room is lost. */
const SEATED = [500, 1000, 2000, 3000, 3000];

export type RetryReason = "not-found" | "unavailable";

/**
 * The wait before try number `attempt` (from 0), with a little jitter so a
 * room's phones do not all come back at once. Null once it is time to stop.
 */
export function joinRetryDelay(reason: RetryReason, attempt: number, seated: boolean, random: () => number = Math.random): number | null {
  const waits = seated ? SEATED : reason === "not-found" ? FIRST_NOT_FOUND : UNAVAILABLE;
  const wait = waits[attempt];
  return wait === undefined ? null : Math.round(wait * (0.7 + random() * 0.6));
}
