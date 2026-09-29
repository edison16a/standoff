/**
 * The two places a person can play, which the host hands out in the
 * lobby. Every side has exactly one QB, and a side with any people on it
 * has a person at QB; everyone else on the side is a runner.
 */
export const ROLES = ["qb", "runner"] as const;
export type LobbyRole = (typeof ROLES)[number];

export const ROLE_NAMES: Record<LobbyRole, string> = { qb: "Quarterback", runner: "Runner" };
export const ROLE_SHORT: Record<LobbyRole, string> = { qb: "QB", runner: "Runner" };

export function isRole(value: unknown): value is LobbyRole {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
