import { z } from "zod";
import { CHARACTER_IDS } from "../characters";

/**
 * What this phone's controller keeps across a reload or a dropped page,
 * so it comes back where the player left it: the setup step, the way
 * they steer, the calibrated straight ahead and the driver they asked
 * for. Everything else comes from the host again. It lives in session
 * storage, keyed by room and seat, like the platform's seat token, so a
 * new room or a closed tab starts fresh.
 */
const memorySchema = z.object({
  step: z.enum(["calibrate", "kart", "ready"]),
  steerMode: z.enum(["tilt", "buttons"]),
  calibrated: z.boolean(),
  /** The wheel angle taken as straight ahead, in radians. */
  zero: z.number().finite(),
  wanted: z.enum(CHARACTER_IDS).nullable(),
});

export type ControllerMemory = z.infer<typeof memorySchema>;

/** The slice of Storage this needs, so tests can pass a plain map. */
export type MemoryStore = Pick<Storage, "getItem" | "setItem">;

const key = (code: string, seat: number) => `standoff:magic-kart:${code}:${seat}`;

function sessionStore(): MemoryStore | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    // Storage can be blocked outright, which only means a reload starts over.
    return null;
  }
}

export function loadMemory(code: string, seat: number, store = sessionStore()): ControllerMemory | null {
  try {
    const raw = store?.getItem(key(code, seat));
    if (!raw) return null;
    const parsed = memorySchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveMemory(code: string, seat: number, memory: ControllerMemory, store = sessionStore()): void {
  try {
    store?.setItem(key(code, seat), JSON.stringify(memory));
  } catch {
    // A full or blocked storage only costs the resume after a reload.
  }
}
