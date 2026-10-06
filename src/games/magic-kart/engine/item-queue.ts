import type { ItemKind } from "./items";
import { EFFECTS } from "./tuning";

/** A power up in hand, and the race time its roulette stops. */
export interface HeldItem {
  kind: ItemKind;
  readyAt: number;
}

/**
 * The power ups a kart carries: the one it uses next, then one queued
 * behind it. Two is enough to plan with (a shield up front and an orb
 * behind it) without a kart hoarding a whole row of boxes.
 */
export interface ItemHand {
  items: HeldItem[];
  /** Race time the queued item has slid forward and can be used. */
  slideUntil: number;
  /** Items used so far, so a screen can tell a slide forward from a fresh pickup. */
  itemUses: number;
}

export const MAX_HELD = 2;

export function emptyHand(): ItemHand {
  return { items: [], slideUntil: 0, itemUses: 0 };
}

export function currentItem(hand: ItemHand): HeldItem | null {
  return hand.items[0] ?? null;
}

export function queuedItem(hand: ItemHand): HeldItem | null {
  return hand.items[1] ?? null;
}

/** How many more power ups fit in the hand. */
export function roomFor(hand: ItemHand): number {
  return MAX_HELD - hand.items.length;
}

/** The roulette of this item is still spinning. */
export function isRolling(item: HeldItem | null, time: number): boolean {
  return item !== null && time < item.readyAt;
}

/**
 * Puts freshly rolled items behind any already held, as many as fit, and
 * returns the ones that went in. Each spins its own roulette, and the
 * second from a double box lands a beat after the first, so both reveals
 * can be seen.
 */
export function stow(hand: ItemHand, kinds: readonly ItemKind[], time: number): ItemKind[] {
  const taken = kinds.slice(0, Math.max(0, roomFor(hand)));
  taken.forEach((kind, i) => hand.items.push({ kind, readyAt: time + EFFECTS.roulette + i * EFFECTS.rouletteStagger }));
  return taken;
}

/** The current item can be fired now: its roulette has stopped and nothing is still sliding forward. */
export function canUse(hand: ItemHand, time: number): boolean {
  const first = currentItem(hand);
  return first !== null && time >= first.readyAt && time >= hand.slideUntil;
}

/**
 * Takes the current item to fire it, when it can be used. The queued
 * item slides forward and is held back for the length of the slide, so
 * one hurried double tap never fires both.
 */
export function takeCurrent(hand: ItemHand, time: number): ItemKind | null {
  if (!canUse(hand, time)) return null;
  const first = hand.items.shift()!;
  hand.itemUses += 1;
  if (hand.items.length > 0) hand.slideUntil = time + EFFECTS.queueSlide;
  return first.kind;
}
