import { z } from "zod";
import type { HostRoomApi } from "@/platform/games/game-api";
import { BOX_KEYS, type BoxKey } from "./key-boxer";

/**
 * What the admin panel's Keyboard player sends. Boxing has no phone
 * controller, so the test seat says hello (the menu switches to keyboard
 * mode) and then sends each key of keyboard mode, down and up.
 */
export const keyboardHelloSchema = z.object({ kind: z.literal("keyboard") });
export const boxKeySchema = z.object({ kind: z.literal("box-key"), key: z.enum(BOX_KEYS), down: z.boolean() });

export type KeyboardHello = z.infer<typeof keyboardHelloSchema>;
export type BoxKeyMessage = z.infer<typeof boxKeySchema>;

export interface KeyboardSeatHandlers {
  hello(): void;
  key(key: BoxKey, down: boolean): void;
}

/** Hears the keyboard seat. Anything else, or anything malformed, is ignored. */
export function listenKeyboardSeat(room: HostRoomApi, handlers: KeyboardSeatHandlers): () => void {
  return room.on((event) => {
    if (event.type !== "message") return;
    if (keyboardHelloSchema.safeParse(event.payload).success) return handlers.hello();
    const key = boxKeySchema.safeParse(event.payload);
    if (key.success) handlers.key(key.data.key, key.data.down);
  });
}
