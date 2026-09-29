/**
 * The two places on a side, which the host hands out in the lobby. Every
 * side has one quarterback, who throws and kicks, and up to two runners,
 * who catch and carry. On defence all three cover and tackle.
 */
export const ROLES = ["qb", "runner"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_NAMES: Record<Role, string> = { qb: "Quarterback", runner: "Runner" };
export const ROLE_SHORT: Record<Role, string> = { qb: "QB", runner: "RB" };

/** The most runners a side fields. */
export const MAX_RUNNERS = 2;

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
