/**
 * One colour per seat, shared by every game so a player keeps the same
 * colour for their laser dot, their name tag and their score everywhere.
 * Seat one is red and seat two green, like fencing's scoring lamps.
 */
export const PLAYER_COLORS = ["#ff4757", "#2ed573", "#3a86ff", "#ffb400"] as const;

export function playerColor(seat: number): string {
  return PLAYER_COLORS[(seat - 1) % PLAYER_COLORS.length] ?? PLAYER_COLORS[0];
}
