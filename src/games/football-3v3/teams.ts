export type TeamId = 0 | 1;
export const TEAM_IDS: readonly TeamId[] = [0, 1];

export interface Team {
  name: string;
  /** Three letters for the scoreboard. */
  code: string;
  /** The main colour: jerseys, end zone paint, scoreboard, lobby and phone. */
  color: string;
  /** A darker shade for pants, helmet stripes and shadows. */
  dark: string;
  /** Numbers and trim. */
  trim: string;
}

/**
 * The two sides. Storm defends the left end zone (negative x) and attacks
 * right for the whole game, Blaze the other way. Keeping ends fixed keeps
 * the camera and the phone controls the same all game.
 */
export const TEAMS: Record<TeamId, Team> = {
  0: { name: "Storm", code: "STM", color: "#1e5bd8", dark: "#0b2a6b", trim: "#f5c518" },
  1: { name: "Blaze", code: "BLZ", color: "#e2412b", dark: "#6d1408", trim: "#ffffff" },
};

export function other(team: TeamId): TeamId {
  return team === 0 ? 1 : 0;
}

/** Which way a team attacks along x: Storm to +x, Blaze to -x. */
export function attackSign(team: TeamId): 1 | -1 {
  return team === 0 ? 1 : -1;
}
