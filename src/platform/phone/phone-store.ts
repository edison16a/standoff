import { createStore, type StoreApi } from "zustand/vanilla";
import type { Player } from "@/platform/games/game-api";
import type { SocketStatus } from "@/platform/net/socket-client";
import type { JoinErrorReason } from "@/platform/protocol";

/** Where the phone is in joining a room. */
export type PhoneStage = "name" | "joining" | "playing" | "error";

/**
 * `replaced` means this seat was taken over by the same page in another
 * tab, and `load` that the game's own code would not load.
 */
export type PhoneError = JoinErrorReason | "replaced" | "load";

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
  /** Everyone in the room, as the host last reported. */
  players: Player[];
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
    players: [],
  }));
}
