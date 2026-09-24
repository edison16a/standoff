import type { RoomStore } from "../backend";
import { isDead, type RoomRecord } from "../room-state";

/** Rooms left untouched this long are dropped, like the Redis TTL. */
const IDLE_MS = 6 * 60 * 60 * 1000;

/**
 * Rooms in a plain map, for the local server where every connection lives
 * in the same process. Node runs one callback at a time and `update` never
 * awaits between reading and writing, so each update is atomic for free.
 */
export class MemoryStore implements RoomStore {
  private readonly rooms = new Map<string, { room: RoomRecord; touched: number }>();
  private readonly counters = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly now: () => number = Date.now) {}

  async create(room: RoomRecord): Promise<boolean> {
    this.sweep();
    if (this.rooms.has(room.code)) return false;
    this.rooms.set(room.code, { room, touched: this.now() });
    return true;
  }

  async get(code: string): Promise<RoomRecord | null> {
    return this.rooms.get(code)?.room ?? null;
  }

  async update<T>(code: string, change: (room: RoomRecord) => { room: RoomRecord | null; result: T }): Promise<T | null> {
    const entry = this.rooms.get(code);
    if (!entry) return null;
    const { room, result } = change(entry.room);
    if (room) this.rooms.set(code, { room, touched: this.now() });
    return result;
  }

  async delete(code: string): Promise<void> {
    this.rooms.delete(code);
  }

  async bump(key: string): Promise<number> {
    const now = this.now();
    const counter = this.counters.get(key);
    if (!counter || counter.resetAt <= now) {
      // Expired counters are dropped here, so the map stays small.
      for (const [name, old] of this.counters) if (old.resetAt <= now) this.counters.delete(name);
      this.counters.set(key, { count: 1, resetAt: now + 60_000 });
      return 1;
    }
    counter.count += 1;
    return counter.count;
  }

  get size(): number {
    return this.rooms.size;
  }

  /** Frees the codes of rooms nobody can use any more, like the Redis store's short expiry. */
  private sweep(): void {
    const now = this.now();
    for (const [code, entry] of this.rooms) {
      if (entry.touched < now - IDLE_MS || isDead(entry.room, now)) this.rooms.delete(code);
    }
  }
}
