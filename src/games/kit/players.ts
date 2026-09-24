/**
 * One colour per seat, shared by every game so a player keeps the same
 * colour for their laser dot, their name tag and their score everywhere.
 * Seat one is red and seat two green, like fencing's scoring lamps. Seats
 * five and six are for the six player team games.
 */
export const PLAYER_COLORS = ["#ff4757", "#2ed573", "#3a86ff", "#ffb400", "#a855f7", "#00c2d1"] as const;

export function playerColor(seat: number): string {
  return PLAYER_COLORS[(seat - 1) % PLAYER_COLORS.length] ?? PLAYER_COLORS[0];
}
