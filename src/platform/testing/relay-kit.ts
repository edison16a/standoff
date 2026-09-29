import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import type { Backend } from "@/platform/relay/backend";
import { MemoryBus } from "@/platform/relay/memory/memory-bus";
import { MemoryStore } from "@/platform/relay/memory/memory-store";
import { RelayConnection } from "@/platform/relay/relay-connection";

/**
 * Drives the relay by hand in tests: one fake socket per connection, a
 * clock the test moves, and helpers to wait for the bus to deliver.
 */
export class RecordingSocket {
  readonly inbox: ServerEnvelope[] = [];
  closedWith: number | null = null;
  send(data: string) {
    this.inbox.push(JSON.parse(data) as ServerEnvelope);
  }
  close(code = 1000) {
    this.closedWith = code;
  }
  last<T extends ServerEnvelope["type"]>(type: T): Extract<ServerEnvelope, { type: T }> | undefined {
    return [...this.inbox].reverse().find((m) => m.type === type) as Extract<ServerEnvelope, { type: T }> | undefined;
  }
  count(type: ServerEnvelope["type"]): number {
    return this.inbox.filter((m) => m.type === type).length;
  }
}

/** Lets queued handlers and microtask deliveries run to completion. */
export async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

export function memoryBackend(now: () => number = Date.now): Backend {
  return { store: new MemoryStore(now), bus: new MemoryBus(), label: "test", shared: true };
}

export interface Connected {
  socket: RecordingSocket;
  connection: RelayConnection;
  send(envelope: ClientEnvelope): Promise<void>;
  drop(): Promise<void>;
}

/** Where a test connection lands: an instance with its own rooms, and the deployment's secret. */
export interface KitPlace {
  client?: string;
  sharedRooms?: boolean;
  secret?: string;
  instance?: string;
}

export function connectTo(backend: Backend, now: () => number, place: string | KitPlace = "test"): Connected {
  const socket = new RecordingSocket();
  const { client = "test", sharedRooms = true, secret, instance } = typeof place === "string" ? { client: place } : place;
  const ctx = { backend, joinUrlFor: (code: string) => `https://game.test/join/${code}`, now, client, sharedRooms, deadline: null, secret, instance };
  const connection = new RelayConnection(socket, ctx);
  return {
    socket,
    connection,
    send: async (envelope) => {
      connection.receive(envelope);
      await connection.settled();
      await flush();
    },
    drop: async () => {
      connection.disconnect();
      await connection.settled();
      await flush();
    },
  };
}
