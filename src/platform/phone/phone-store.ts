import { createStore, type StoreApi } from "zustand/vanilla";
import type { Player } from "@/platform/games/game-api";
import type { SocketStatus } from "@/platform/net/socket-client";
import type { JoinErrorReason, NameClash } from "@/platform/protocol";

/** Where the phone is in joining a room. */
export type PhoneStage = "name" | "joining" | "playing" | "error";

/**
 * `replaced` means this seat was taken over by the same page in another
 * tab, `load` that the game's own code would not load, and `lost` that
 * the room this phone sat in is gone, so it waits for the host's new code.
 */
export type PhoneError = Exclude<JoinErrorReason, NameClash | "limit"> | "replaced" | "load" | "lost";

/**
 * What the platform's phone screens render. Each game keeps its own store
 * for everything inside the game.
 */
export interface PhoneState {
  stage: PhoneStage;
  error: PhoneError | null;
  status: SocketStatus;
  name: string;
  seat: number | null;
  /** The game this room plays, known once seated. */
  game: string | null;
  hostAway: boolean;
  /** A seated phone trying to get back into its room after a join failed. */
  rejoining: boolean;
  /** Everyone in the room, as the host last reported. */
  players: Player[];
  /** The new room's code, once the host remade its lobby. The page follows it. */
  movedTo: string | null;
  /** Why the name screen is back: the name is in use, or its player dropped and can reconnect. */
  clash: { reason: NameClash; name: string } | null;
}

/**
 * One per room, never one per page. A tab that moves on to the host's next
 * room must start at the name screen, not where the last room ended.
 */
export function createPhoneStore(): StoreApi<PhoneState> {
  return createStore<PhoneState>(() => ({
    stage: "name",
    error: null,
    status: "connecting",
    name: "",
    seat: null,
    game: null,
    hostAway: false,
    rejoining: false,
    players: [],
    movedTo: null,
    clash: null,
  }));
}
