import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";

export type SocketStatus = "connecting" | "open" | "reconnecting" | "unreachable" | "replaced" | "closed";

export interface OpenInfo {
  /**
   * True for the socket that takes over from one the server is about to
   * cut. The old one still holds the seat or room until this one confirms.
   */
  handover: boolean;
}

export interface SocketHandlers {
  /**
   * Runs on every new socket, which is where a client announces itself
   * (join, or resume with its token). `send` goes to that new socket.
   */
  onOpen(send: (message: ClientEnvelope) => void, info: OpenInfo): void;
  onMessage(message: ServerEnvelope): void;
  onStatus(status: SocketStatus): void;
  /** A handover socket was refused. The old socket carries on and the client tries again soon. */
  onHandoverFailed?(): void;
}

export interface SocketOptions {
  /** Start on the HTTP stream rather than trying a WebSocket first. */
  stream?: boolean;
}
