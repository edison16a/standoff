import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";

export type SocketStatus = "connecting" | "open" | "reconnecting" | "unreachable" | "replaced" | "closed";

export interface SocketHandlers {
  /**
   * Runs on every new socket, which is where a client announces itself
   * (join, or resume with its token). `send` goes to that new socket.
   */
  onOpen(send: (message: ClientEnvelope) => void): void;
  onMessage(message: ServerEnvelope): void;
  onStatus(status: SocketStatus): void;
}
