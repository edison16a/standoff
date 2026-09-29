import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import { useHostStore } from "@/platform/host/host-store";
import { sessionMemory } from "@/platform/host/room-memory";

/** Just enough of a browser WebSocket to drive the host by hand. Every socket opens at once. */
export class FakeSocket {
  static all: FakeSocket[] = [];
  readyState = 0;
  bufferedAmount = 0;
  readonly sent: ClientEnvelope[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  constructor() {
    FakeSocket.all.push(this);
    queueMicrotask(() => {
      if (this.readyState !== 0) return;
      this.readyState = 1;
      this.onopen?.();
    });
  }
  send(data: string) {
    this.sent.push(JSON.parse(data) as ClientEnvelope);
  }
  close(code = 1000) {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.onclose?.({ code });
  }
  receive(message: ServerEnvelope) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  said<T extends ClientEnvelope["type"]>(type: T): Extract<ClientEnvelope, { type: T }>[] {
    return this.sent.filter((message): message is Extract<ClientEnvelope, { type: T }> => message.type === type);
  }
}

export const TOKEN = "t".repeat(20);

export function created(code: string, token = TOKEN, extra: { sharedRooms?: boolean; instance?: string } = {}): ServerEnvelope {
  return { type: "room:created", code, game: "blade-clash", seats: 2, token, joinUrl: `https://x/join/${code}`, sharedRooms: true, ...extra };
}

export async function tick(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

/** Answers every room check not yet answered, as the relay would. */
export function answerChecks(ok: boolean, reason: "not-found" | "no-echo" = "not-found"): void {
  for (const socket of FakeSocket.all) {
    if (socket.readyState === 3) continue;
    for (const check of socket.said("probe:room")) socket.receive(ok ? { type: "probe:result", nonce: check.nonce, ok } : { type: "probe:result", nonce: check.nonce, ok, reason });
  }
}

/** A fresh page for the host: sockets, storage and the store. */
export function resetHostPage(): void {
  FakeSocket.all = [];
  sessionMemory.forget();
  useHostStore.setState(useHostStore.getInitialState(), true);
  Object.assign(globalThis, {
    WebSocket: FakeSocket,
    location: { protocol: "http:", host: "localhost" },
    window: { addEventListener() {}, removeEventListener() {} },
    localStorage: { getItem: () => null, setItem() {} },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  });
}

export function clearHostPage(): void {
  for (const key of ["location", "window", "localStorage", "sessionStorage"]) Reflect.deleteProperty(globalThis, key);
}
