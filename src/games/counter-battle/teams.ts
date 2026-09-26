import type { TeamId } from "./engine/fighter";

export interface Team {
  name: string;
  /** The team's bright colour: kit panels, banners and the score. */
  color: string;
  /** A deep shade of it, for the kit's darker parts. */
  dark: string;
}

/**
 * The two sides. They are hot pink and electric cyan, well clear of the
 * seat colours (red, green, blue, amber), so a fighter's kit says which
 * team they are on and their name tag says which player they are.
 */
export const TEAMS: Record<TeamId, Team> = {
  0: { name: "Pink", color: "#ff3fc8", dark: "#6d0d56" },
  1: { name: "Cyan", color: "#16d9ff", dark: "#0a4f66" },
};
