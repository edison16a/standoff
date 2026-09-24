import type { RoomStore } from "../backend";
import type { RoomRecord } from "../room-state";

/** Rooms left untouched this long are dropped, like the Redis TTL. */
const IDLE_MS = 6 * 60 * 60 * 1000;

/**
 * Rooms in a plain map, for the local server where every connection lives
 * in the same process. Node runs one callback at a time and `update` never
 * awaits between reading and writing, so each update is atomic for free.
 */
export class MemoryStore implements RoomStore {
  private readonly rooms = new Map<string, { room: RoomRecord; touched: number }>();

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

  get size(): number {
    return this.rooms.size;
  }

  private sweep(): void {
    const cutoff = this.now() - IDLE_MS;
    for (const [code, entry] of this.rooms) if (entry.touched < cutoff) this.rooms.delete(code);
  }
}
