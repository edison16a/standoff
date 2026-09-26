/** Player slots. Slot 1 fences from the left, slot 2 from the right. */
export type Slot = 1 | 2;

export const SLOTS: readonly Slot[] = [1, 2];

export function otherSlot(slot: Slot): Slot {
  return slot === 1 ? 2 : 1;
}

/** Two of something, one per player, indexed by slot. */
export type PerSlot<T> = Record<Slot, T>;

export function perSlot<T>(make: (slot: Slot) => T): PerSlot<T> {
  return { 1: make(1), 2: make(2) };
}
