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
}
