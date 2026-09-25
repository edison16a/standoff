import type { Cover, DefenseInput, Hand } from "./types";

/** How far a full duck drops the head, in metres. */
export const DUCK_DROP = 0.3;
/** How far a full slip moves the head sideways, in metres. */
export const SLIP_SIDE = 0.3;

/** The ways a boxer can hold their hands, for the computer boxer and scripted fights. */
export type Shell = "loose" | "guard" | "high" | "body";

/** A defence described in words: how the hands are held, and where the head has gone. */
export interface Posture {
  shell: Shell;
  /** 0 standing tall to 1 in a full duck. */
  duck: number;
  /** -1 slipped to the boxer's own left, 1 to their right. */
  slip: number;
  /** For a high shell, the side of the head the glove covers. */
  side?: Hand;
  raise?: boolean;
  reach?: boolean;
}

const LOOSE: Cover = { face: 0.3, side: 0.2, body: 0.35 };
/** Both gloves by the face and elbows in: straights to the head stop, the sides and body are half covered. */
const GUARD: Cover = { face: 1, side: 0.55, body: 0.5 };
/** A glove pinned to the side of the head, for a hook. */
const HIGH: Cover = { face: 0.75, side: 1, body: 0.3 };
/** Elbows down over the ribs, for a body shot. */
const BODY: Cover = { face: 0.45, side: 0.25, body: 1 };

const SHELLS: Record<Shell, Cover> = { loose: LOOSE, guard: GUARD, high: HIGH, body: BODY };

/** Turns a posture into the same input the camera gives a player, so the computer plays by the same rules. */
export function defenseOf(posture: Partial<Posture>): DefenseInput {
  const shell = posture.shell ?? "loose";
  const both = SHELLS[shell];
  // A high shell only pins one glove to the head; the other stays in a guard.
  const cover: Record<Hand, Cover> =
    shell === "high"
      ? { left: posture.side === "left" ? { ...HIGH } : { ...GUARD }, right: posture.side === "right" ? { ...HIGH } : { ...GUARD } }
      : { left: { ...both }, right: { ...both } };
  return {
    guard: shell === "guard" || shell === "high",
    head: { x: (posture.slip ?? 0) * SLIP_SIDE, y: -(posture.duck ?? 0) * DUCK_DROP },
    cover,
    raise: posture.raise ?? false,
    reach: posture.reach ?? false,
  };
}
