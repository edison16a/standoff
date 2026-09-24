import type { ServerEnvelope } from "../../src/shared/protocol";

/**
 * One connected client as the room logic sees it. The socket layer wraps a
 * real WebSocket in this, and the tests wrap an array. Keeping the rooms
 * ignorant of `ws` is what makes them testable without opening ports.
 */
export interface Peer {
  send(message: ServerEnvelope): void;
  close(): void;
}
