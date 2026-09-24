import type { RoomRecord } from "./room-state";

/**
 * Where rooms live. `update` must be atomic per room: the change function
 * sees the latest record and nothing else can write that room until it
 * returns. Returning null from the change function leaves the room as is.
 */
export interface RoomStore {
  /** Saves a new room. Returns false if the code is already taken. */
  create(room: RoomRecord): Promise<boolean>;
  get(code: string): Promise<RoomRecord | null>;
  update<T>(code: string, change: (room: RoomRecord) => { room: RoomRecord | null; result: T }): Promise<T | null>;
  delete(code: string): Promise<void>;
}

/**
 * Messages between connections, which may live in different server
 * instances. Order is kept per publisher, which is what the relay needs:
 * one phone's frames arrive at the host in the order the phone sent them.
 */
export interface Bus {
  /** Resolves to how many subscribers it reached, so a sender can tell nobody is listening. */
  publish(channel: string, message: string): Promise<number>;
  /** Resolves once the subscription is live. Returns an unsubscribe. */
  subscribe(channel: string, onMessage: (message: string) => void): Promise<() => Promise<void>>;
}

export interface Backend {
  store: RoomStore;
  bus: Bus;
  /** Shown in the server log so it is obvious which mode is running. */
  label: string;
  /** True when rooms are visible to every server instance, not just this one. */
  shared: boolean;
  /** Closes network connections, where there are any. */
  close?(): Promise<void>;
}
