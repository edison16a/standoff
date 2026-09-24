import { z } from "zod";

/**
 * Messages the gamepad kit sends from phone to host. Their kinds all start
 * with "pad", so a game using the kit must not name its own messages that
 * way. The stick is x right and y up, each from -1 to 1.
 */

/** Button names are the game's to choose, short and lower case. */
export const buttonName = z.string().regex(/^[a-z][a-z0-9]{0,11}$/);

const axis = z.number().min(-1).max(1);

/** The live stick and which buttons are held, sent often and allowed to drop. */
export const padStateSchema = z.object({ kind: z.literal("pad"), x: axis, y: axis, held: z.array(buttonName).max(8) });

/** A button going down or up, sent reliably with the stick at that instant. */
export const padPressSchema = z.object({ kind: z.literal("pad-press"), button: buttonName, down: z.boolean(), x: axis, y: axis });

export function isPadKind(kind: string): boolean {
  return kind.startsWith("pad");
}
