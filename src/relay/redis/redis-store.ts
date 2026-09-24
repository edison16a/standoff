import type { Redis } from "ioredis";
import { makeToken } from "../room-code";
import type { RoomStore } from "../backend";
import type { RoomRecord } from "../room-state";

/** Rooms expire this long after their last change, so abandoned ones clean themselves up. */
const ROOM_TTL_S = 6 * 60 * 60;
/** A lock is released by its holder, or expires on its own if that holder dies. */
const LOCK_TTL_MS = 3000;
const LOCK_WAIT_MS = 4000;

const roomKey = (code: string) => `standoff:room:${code}`;
const lockKey = (code: string) => `standoff:lock:${code}`;

/** Deletes the lock only if we still hold it, in one step on the server. */
const RELEASE = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;

/**
 * Rooms as JSON values in Redis. Room changes are rare (joins, drops,
 * resumes), so each update takes a short lock on the room, reads, applies
 * the same pure rules the memory store uses, and writes back. That keeps
 * one set of seat rules for both backends instead of a second copy in Lua.
 */
export class RedisStore implements RoomStore {
  constructor(private readonly redis: Redis) {}

  async create(room: RoomRecord): Promise<boolean> {
    const set = await this.redis.set(roomKey(room.code), JSON.stringify(room), "EX", ROOM_TTL_S, "NX");
    return set === "OK";
  }

  async get(code: string): Promise<RoomRecord | null> {
    const raw = await this.redis.get(roomKey(code));
    return raw ? (JSON.parse(raw) as RoomRecord) : null;
  }

  async update<T>(code: string, change: (room: RoomRecord) => { room: RoomRecord | null; result: T }): Promise<T | null> {
    const token = await this.lock(code);
    try {
      const room = await this.get(code);
      if (!room) return null;
      const { room: next, result } = change(room);
      if (next) await this.redis.set(roomKey(code), JSON.stringify(next), "EX", ROOM_TTL_S);
      return result;
    } finally {
      await this.redis.eval(RELEASE, 1, lockKey(code), token);
    }
  }

  async delete(code: string): Promise<void> {
    await this.redis.del(roomKey(code));
  }

  private async lock(code: string): Promise<string> {
    const token = makeToken();
    const deadline = Date.now() + LOCK_WAIT_MS;
    for (let wait = 10; ; wait = Math.min(wait * 2, 100)) {
      if ((await this.redis.set(lockKey(code), token, "PX", LOCK_TTL_MS, "NX")) === "OK") return token;
      if (Date.now() > deadline) throw new Error(`Timed out waiting for room ${code}`);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
}
