/**
 * Where the host keeps its room's code and token. The tab's own memory
 * lasts as long as the tab, so a reload lands back in the same game
 * instead of stranding the phones. Session storage dies with the tab, so
 * nothing outlives the game. The page keeps its own copy too, since every
 * socket handover resumes with it, and that must work where storage is
 * blocked. A room still being checked (see RoomCandidate) gets a plain
 * memory of its own, so it never touches the tab's.
 */
const KEY = "standoff:host-room";

export interface RememberedRoom {
  code: string;
  token: string;
  /** The game and seat count, so a lost room can be made again. Empty for rooms saved by older tabs. */
  game: string;
  seats: number;
}

export interface RoomMemory {
  recall(): RememberedRoom | null;
  remember(room: RememberedRoom): void;
  forget(): void;
}

let held: RememberedRoom | null = null;

export const sessionMemory: RoomMemory = {
  recall() {
    if (held) return held;
    try {
      const raw = sessionStorage.getItem(KEY);
      return raw ? parse(raw) : null;
    } catch {
      return null;
    }
  },
  remember(room) {
    held = room;
    try {
      sessionStorage.setItem(KEY, JSON.stringify(room));
    } catch {
      // Without storage a reload just starts a new room.
    }
  },
  forget() {
    held = null;
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      // Nothing to forget.
    }
  },
};

/** A memory that lives in this object alone. */
export function localMemory(): RoomMemory {
  let room: RememberedRoom | null = null;
  return {
    recall: () => room,
    remember: (next) => (room = next),
    forget: () => (room = null),
  };
}

/** Tolerates the older shape, which had only the code and token. */
function parse(raw: string): RememberedRoom | null {
  const parsed = JSON.parse(raw) as Partial<RememberedRoom> | null;
  if (!parsed?.code || !parsed.token) return null;
  return { code: parsed.code, token: parsed.token, game: parsed.game ?? "", seats: parsed.seats ?? 0 };
}
