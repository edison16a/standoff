import { z } from "zod";
import type { HostRoomApi } from "@/platform/games/game-api";

/**
 * What the admin panel's Keyboard player sends. Cube Game has no phone
 * controller, so the test seat's jump keys come here and press like the
 * keys on the computer. `at` is when the key went down on this page's
 * clock, since the binding runs on this page and the trip through the
 * room would otherwise make every jump late.
 */
export const keyJumpSchema = z.object({
  kind: z.literal("key-jump"),
  player: z.union([z.literal(1), z.literal(2)]),
  at: z.number().finite(),
});

export type KeyJumpMessage = z.infer<typeof keyJumpSchema>;

/** Hears the keyboard seat's jumps. Anything else, or anything malformed, is ignored. */
export function listenKeyboardSeat(room: HostRoomApi, jump: (player: 1 | 2, at: number) => void): () => void {
  return room.on((event) => {
    if (event.type !== "message") return;
    const message = keyJumpSchema.safeParse(event.payload);
    if (message.success) jump(message.data.player, message.data.at);
  });
}
