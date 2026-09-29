/**
 * The three roles on a team, which the host hands out in the lobby. A
 * role sets where a player lines up at the check and along the lane,
 * and who they pick up on defence: a Guard guards the other Guard.
 */
export const ROLES = [0, 1, 2] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_NAMES: Record<Role, string> = { 0: "Guard", 1: "Wing", 2: "Big" };

export function nextRole(role: Role): Role {
  return ((role + 1) % ROLES.length) as Role;
}

/** The first role nobody on the team has yet, or the Guard when all are taken. */
export function freeRole(taken: readonly number[]): Role {
  return ROLES.find((r) => !taken.includes(r)) ?? 0;
}
