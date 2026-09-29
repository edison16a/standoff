import type { TeamId } from "./teams";

/**
 * The three places in a side, which the host hands out in the lobby.
 * The striker leads the line and takes the kick off; the wingers keep
 * to their own flank of the pitch.
 */
export const ROLES = ["striker", "left", "right"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_NAMES: Record<Role, string> = { striker: "Striker", left: "Left wing", right: "Right wing" };
export const ROLE_SHORT: Record<Role, string> = { striker: "ST", left: "LW", right: "RW" };

/**
 * The place in the line up a role plays. The engine's second place keeps
 * to the far side of the pitch (-z) and the third to the near side. Red
 * attacks to the right, so its left is the far side; Blue attacks to the
 * left, so its left is the near side.
 */
export function slotFor(team: TeamId, role: Role): number {
  if (role === "striker") return 0;
  const far = team === 0 ? "left" : "right";
  return role === far ? 1 : 2;
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
