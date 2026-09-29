/**
 * The three places on a side, which the host hands out in the lobby. A
 * role is the player's slot: the Striker leads the line through the
 * middle and takes the kick off, the wingers keep to their flank. On
 * defence a player guards the opponent in the same channel.
 */
export const ROLES = [0, 1, 2] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_NAMES: Record<Role, string> = { 0: "Striker", 1: "Left wing", 2: "Right wing" };

/** A slot as a role, with anything unknown read as the Striker. */
export function roleOf(slot: number | undefined): Role {
  return slot === 1 || slot === 2 ? slot : 0;
}

export function nextRole(role: Role): Role {
  return ((role + 1) % ROLES.length) as Role;
}

/** The first role nobody on the side has yet, or the Striker when all are taken. */
export function freeRole(taken: readonly number[]): Role {
  return ROLES.find((r) => !taken.includes(r)) ?? 0;
}
