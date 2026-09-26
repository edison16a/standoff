import type { Seat } from "@/platform/protocol";
import type { SeatView } from "../protocol/messages";

export type TeamRow = SeatView & { seat: Seat };

/**
 * The team list on the ready page. Our own flag comes from this phone,
 * so a tap shows at once rather than a round trip later when the host
 * echoes it back.
 */
export function teamRows(seats: readonly SeatView[], me: Seat, ready: boolean): TeamRow[] {
  return seats
    .map((s, i) => ({ ...s, seat: (i + 1) as Seat, ready: i + 1 === me ? ready : s.ready }))
    .filter((s) => s.connected);
}
