export type TeamId = 0 | 1;
export const TEAM_IDS: readonly TeamId[] = [0, 1];

export interface Team {
  name: string;
  /** Three letters for the scoreboard. */
  code: string;
  /** The team's colour for the interface: scoreboard, end zone, lobby, phone. */
  color: string;
  /** A darker partner colour for trims and pads. */
  trim: string;
}

/**
 * The two sides. Red attacks the right end zone (+x) and Blue the left
 * for the whole game, so the camera never has to flip at the quarters.
 */
export const TEAMS: Record<TeamId, Team> = {
  0: { name: "Red", code: "RED", color: "#e5383b", trim: "#7a0f14" },
  1: { name: "Blue", code: "BLU", color: "#2f7bff", trim: "#0e2a66" },
};

export function other(team: TeamId): TeamId {
  return team === 0 ? 1 : 0;
}

/** Which way a team attacks along x: Red to the right (+1), Blue to the left (-1). */
export function attackSign(team: TeamId): 1 | -1 {
  return team === 0 ? 1 : -1;
}
