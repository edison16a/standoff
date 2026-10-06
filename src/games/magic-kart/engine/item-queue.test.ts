import { describe, expect, it } from "vitest";
import { canUse, currentItem, emptyHand, isRolling, MAX_HELD, queuedItem, roomFor, stow, takeCurrent } from "./item-queue";
import { EFFECTS } from "./tuning";

describe("the two item hand", () => {
  it("holds the current item and one queued behind it, no more", () => {
    const hand = emptyHand();
    expect(roomFor(hand)).toBe(MAX_HELD);
    expect(stow(hand, ["orb"], 0)).toEqual(["orb"]);
    expect(stow(hand, ["nitro", "ice"], 1)).toEqual(["nitro"]);
    expect(currentItem(hand)?.kind).toBe("orb");
    expect(queuedItem(hand)?.kind).toBe("nitro");
    expect(roomFor(hand)).toBe(0);
    expect(stow(hand, ["shield"], 2)).toEqual([]);
    expect(hand.items).toHaveLength(2);
  });

  it("spins each roulette, the second of a pair landing a beat after the first", () => {
    const hand = emptyHand();
    stow(hand, ["orb", "ice"], 10);
    const [first, second] = hand.items;
    expect(first!.readyAt).toBeCloseTo(10 + EFFECTS.roulette);
    expect(second!.readyAt).toBeCloseTo(10 + EFFECTS.roulette + EFFECTS.rouletteStagger);
    expect(isRolling(first!, 10 + EFFECTS.roulette - 0.01)).toBe(true);
    expect(isRolling(first!, 10 + EFFECTS.roulette)).toBe(false);
    expect(isRolling(null, 0)).toBe(false);
  });

  it("cannot fire while the roulette spins", () => {
    const hand = emptyHand();
    stow(hand, ["nitro"], 0);
    expect(canUse(hand, EFFECTS.roulette - 0.1)).toBe(false);
    expect(takeCurrent(hand, EFFECTS.roulette - 0.1)).toBeNull();
    expect(takeCurrent(hand, EFFECTS.roulette)).toBe("nitro");
    expect(takeCurrent(hand, 99)).toBeNull();
  });

  it("slides the queued item forward and holds it back for the slide, so one tap fires one", () => {
    const hand = emptyHand();
    stow(hand, ["orb", "shield"], 0);
    const t = 5;
    expect(takeCurrent(hand, t)).toBe("orb");
    expect(currentItem(hand)?.kind).toBe("shield");
    expect(queuedItem(hand)).toBeNull();
    expect(hand.itemUses).toBe(1);
    expect(takeCurrent(hand, t + EFFECTS.queueSlide / 2)).toBeNull();
    expect(takeCurrent(hand, t + EFFECTS.queueSlide)).toBe("shield");
    expect(hand.itemUses).toBe(2);
    expect(hand.items).toEqual([]);
  });

  it("frees a place for a new item as soon as the front one is used", () => {
    const hand = emptyHand();
    stow(hand, ["orb", "orb"], 0);
    takeCurrent(hand, 3);
    expect(roomFor(hand)).toBe(1);
    expect(stow(hand, ["ghost"], 3)).toEqual(["ghost"]);
    expect(hand.items.map((item) => item.kind)).toEqual(["orb", "ghost"]);
  });
});
