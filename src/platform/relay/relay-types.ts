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
  /** The client's network address, for rate limits shared across connections. */
  client: string;
  /** False when this server has several instances but no shared store. */
  sharedRooms: boolean;
  /**
   * When this socket will be cut by the platform (epoch ms), if it will be.
   * Vercel ends every function at its maximum duration, sockets included.
   */
  deadline: number | null;
  /** Signs room tokens. Every instance of one deployment shares it (see roomSecret). */
  secret?: string;
  /** Names this server instance, so a host can tell its new socket landed on another. */
  instance?: string;
  /** How the client reached us, for the log. */
  transport?: "ws" | "stream";
}

const INSTANCE = Symbol.for("standoff.instance");

/** A random name for this process, the same for every module copy in it. */
export function instanceId(): string {
  const holder = globalThis as { [INSTANCE]?: string };
  return (holder[INSTANCE] ??= Math.random().toString(36).slice(2, 10));
}

/** How long before the deadline the client is asked to move to a new socket. */
export const ROTATE_LEAD_MS = 30_000;

/**
 * The warning for a socket with `lifetime` ms to live. Short lifetimes, as
 * when simulating Vercel locally, get a third of their life, so the notice
 * never lands on a socket still busy taking over from the one before.
 */
export function rotateLead(lifetime: number): number {
  return Math.min(ROTATE_LEAD_MS, lifetime / 3);
}
