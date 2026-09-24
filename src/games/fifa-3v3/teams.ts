import type { Kit } from "./roster";

export type TeamId = 0 | 1;
export const TEAM_IDS: readonly TeamId[] = [0, 1];

export interface Team {
  name: string;
  /** Three letters for the scoreboard. */
  code: string;
  /** The team's colour for the interface: scoreboard, lobby, phone. */
  color: string;
  kit: Kit;
  keeper: Kit;
}

/**
 * The two sides. Red defends the left goal and attacks right, Blue the
 * other way, for the whole match (there are no halves in four minutes).
 * Keepers wear their own colours, as in real football.
 */
export const TEAMS: Record<TeamId, Team> = {
  0: {
    name: "Red",
    code: "RED",
    color: "#e5383b",
    kit: { shirt: "#d62839", trim: "#ffffff", shorts: "#ffffff", socks: "#d62839", ink: "#ffffff" },
    keeper: { shirt: "#1fbf6a", trim: "#0b3d24", shorts: "#0b3d24", socks: "#1fbf6a", ink: "#0b3d24" },
  },
  1: {
    name: "Blue",
    code: "BLU",
    color: "#2f7bff",
    kit: { shirt: "#1d5fd8", trim: "#ffffff", shorts: "#0e2250", socks: "#1d5fd8", ink: "#ffffff" },
    keeper: { shirt: "#ff9f1c", trim: "#4a2a00", shorts: "#2b2b2b", socks: "#ff9f1c", ink: "#2b2b2b" },
  },
};

export function other(team: TeamId): TeamId {
  return team === 0 ? 1 : 0;
}

/** Which way a team attacks along x: Red to the right (+1), Blue to the left (-1). */
export function attackSign(team: TeamId): 1 | -1 {
  return team === 0 ? 1 : -1;
}
