/**
 * Where each player's gun sits along the bottom of the screen, from -1
 * (left edge) to 1 (right edge). One player holds theirs right of centre
 * like a real first person view. More players spread out evenly, so
 * everyone can find their own gun at a glance.
 */
export function gunSlotX(index: number, count: number): number {
  if (count <= 1) return 0.42;
  const span = count === 2 ? 0.5 : 0.66;
  return -span + (2 * span * index) / (count - 1);
}
