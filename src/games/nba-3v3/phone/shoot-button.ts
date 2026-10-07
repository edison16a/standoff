import type { CourtState } from "../protocol";

/**
 * Whether the phone's Shoot button takes a touch. At the free throw line
 * it wakes once the shooter is set, and it must stay awake for the whole
 * hold: the host stops calling the shooter set as soon as the shot starts,
 * and a button that went dead then would let go of the shot by itself.
 */
export function shootEnabled(court: CourtState, aiming: boolean): boolean {
  const ft = court.freeThrow;
  if (!ft) return true;
  return ft.ready || (ft.mine && aiming);
}
