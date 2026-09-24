import { z } from "zod";

/**
 * The messages the aim kit sends from phone to host. Their kinds all
 * start with "aim", so a game using the kit must not name its own
 * messages that way. Screen points are in the kit's screen space: x and y
 * from -1 to 1, y up.
 */

const coord = z.number().min(-2).max(2);

/** The live aim, sent up to 60 times a second while the game wants it. */
export const aimSchema = z.object({ kind: z.literal("aim"), x: coord, y: coord });

/** A trigger pull, sent reliably with the aim at that instant. */
export const aimFireSchema = z.object({ kind: z.literal("aim-fire"), x: coord, y: coord });

/** Which calibration target this player is looking for, so the big screen can show it. */
export const AIM_STEPS = ["center", "top-left", "bottom-right", "test", "done"] as const;
export type AimStep = (typeof AIM_STEPS)[number];
export const aimStepSchema = z.object({ kind: z.literal("aim-step"), step: z.enum(AIM_STEPS) });

export type AimMessage = z.infer<typeof aimSchema> | z.infer<typeof aimFireSchema> | z.infer<typeof aimStepSchema>;

export function isAimKind(kind: string): boolean {
  return kind.startsWith("aim");
}
