import { z } from "zod";
import type { HostRoomApi } from "@/platform/games/game-api";
import type { KeyMove } from "./key-input";

/**
 * What the admin panel's Keyboard player sends. Subway Runner has no
 * phone controller, so the test seat's keys come here as moves and drive
 * keyboard mode, exactly as the keys on the computer do.
 */
const MOVES = ["left", "right", "jump", "duck"] as const satisfies readonly KeyMove[];

export const keyboardHelloSchema = z.object({ kind: z.literal("keyboard") });
export const keyMoveSchema = z.object({ kind: z.literal("key-move"), move: z.enum(MOVES), down: z.boolean() });

export type KeyboardHello = z.infer<typeof keyboardHelloSchema>;
export type KeyMoveMessage = z.infer<typeof keyMoveSchema>;

export interface KeyboardSeatHandlers {
  /** A keyboard seat sat down, so keyboard mode is how it plays. */
  hello(): void;
  move(move: KeyMove, down: boolean): void;
}

/** Hears the keyboard seat. Anything else, or anything malformed, is ignored. */
export function listenKeyboardSeat(room: HostRoomApi, handlers: KeyboardSeatHandlers): () => void {
  return room.on((event) => {
    if (event.type !== "message") return;
    if (keyboardHelloSchema.safeParse(event.payload).success) return handlers.hello();
    const move = keyMoveSchema.safeParse(event.payload);
    if (move.success) handlers.move(move.data.move, move.data.down);
  });
}
