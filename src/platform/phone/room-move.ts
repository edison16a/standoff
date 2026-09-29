/**
 * When the host remakes its lobby, every phone is told the new room's
 * code and goes straight there, name and all, without the name screen.
 * The move is kept in the page, since the phone changes rooms without a
 * reload, and forgotten once the phone has its new seat.
 */
interface PendingMove {
  code: string;
  /** The name the player chose, or null if they skipped and go by their seat. */
  name: string | null;
}

let pending: PendingMove | null = null;

export function rememberMove(move: PendingMove): void {
  pending = move;
}

/** The move into this room, if the phone is on its way there. */
export function moveInto(code: string): PendingMove | null {
  return pending?.code === code ? pending : null;
}

export function forgetMove(code: string): void {
  if (pending?.code === code) pending = null;
}
