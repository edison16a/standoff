import type { Backend } from "./backend";

/** The bits of a socket the relay needs. `ws` sockets fit as they are. */
export interface SocketLike {
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

/** What a relay connection needs from wherever it is running. */
export interface RelayContext {
  backend: Backend;
  /** Builds the address phones open for a room, from wherever this request came in. */
  joinUrlFor(code: string): string;
  now(): number;
  /** False when this server has several instances but no shared store. */
  sharedRooms: boolean;
  /**
   * When this socket will be cut by the platform (epoch ms), if it will be.
   * Vercel ends every function at its maximum duration, sockets included.
   */
  deadline: number | null;
}

/** How long before the deadline the client is asked to move to a new socket. */
export const ROTATE_LEAD_MS = 30_000;
