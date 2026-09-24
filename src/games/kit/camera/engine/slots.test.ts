import { describe, expect, it } from "vitest";
import { SlotAssigner } from "./slots";

/** Runs frames of people's centres through the assigner, 33 ms apart, and returns each frame's pick. */
function play(assigner: SlotAssigner, frames: number[][], start = 0) {
  return frames.map((centers, i) => assigner.assign(centers, start + i * 33));
}

describe("sorting people into player slots", () => {
  it("makes whoever stands on the left player one", () => {
    const slots = new SlotAssigner();
    expect(slots.assign([0.8, 0.2], 0)).toEqual([1, 0]);
    expect(new SlotAssigner().assign([0.2, 0.8], 0)).toEqual([0, 1]);
  });

  it("never swaps two players standing close together, whatever order the model gives", () => {
    const slots = new SlotAssigner();
    let swaps = 0;
    for (let i = 0; i < 120; i++) {
      // Two players a hand apart in the middle, wobbling, and the model's order flipping every frame.
      const one = 0.46 + Math.sin(i * 1.7) * 0.012;
      const two = 0.54 + Math.cos(i * 2.3) * 0.012;
      const centers = i % 2 ? [two, one] : [one, two];
      const pick = slots.assign(centers, i * 33);
      if (centers[pick[0]!] !== one) swaps++;
    }
    expect(swaps).toBe(0);
  });

  it("keeps players when they really do cross over", () => {
    const slots = new SlotAssigner();
    const frames: number[][] = [];
    for (let i = 0; i <= 20; i++) frames.push([0.3 + i * 0.02, 0.7 - i * 0.02]);
    const picks = play(slots, frames);
    const last = picks[picks.length - 1]!;
    // Player one started on the left at 0.3 and walked right to 0.7.
    expect(frames[frames.length - 1]![last[0]!]).toBeCloseTo(0.7, 6);
  });

  it("gives a lone newcomer the slot for their side", () => {
    expect(new SlotAssigner().assign([0.3], 0)).toEqual([0, null]);
    expect(new SlotAssigner().assign([0.7], 0)).toEqual([null, 0]);
  });

  it("keeps a lone player in their slot as they walk across", () => {
    const slots = new SlotAssigner();
    const frames = Array.from({ length: 15 }, (_, i) => [0.3 + i * 0.03]);
    const picks = play(slots, frames);
    expect(picks.every((pick) => pick[0] === 0 && pick[1] === null)).toBe(true);
  });

  it("gives the free slot to someone who joins a tracked player", () => {
    const slots = new SlotAssigner();
    play(slots, [[0.7], [0.7], [0.7]]);
    // Player two is tracked on the right. Someone steps in, even right beside them.
    expect(slots.assign([0.55, 0.7], 120)).toEqual([0, 1]);
    const other = new SlotAssigner();
    play(other, [[0.3], [0.3]]);
    expect(other.assign([0.3, 0.45], 80)).toEqual([0, 1]);
  });

  it("holds a slot briefly for a player who stepped out, then frees it", () => {
    const slots = new SlotAssigner({ lostMs: 1000 });
    slots.assign([0.3, 0.7], 0);
    slots.assign([0.7], 100);
    // Player one comes back on the left and is player one again.
    expect(slots.assign([0.32, 0.7], 600)).toEqual([0, 1]);
    // Long gone: a new person on the right side of an empty picture takes slot two.
    expect(slots.assign([0.6], 5000)).toEqual([null, 0]);
    expect(slots.tracked(1, 5000)).toBe(true);
    expect(slots.tracked(0, 5000)).toBe(false);
  });

  it("with one slot, follows the tracked player and ignores a bystander", () => {
    const slots = new SlotAssigner({ slots: 1 });
    expect(slots.assign([0.2, 0.52], 0)).toEqual([1]);
    expect(slots.assign([0.62, 0.4], 33)).toEqual([0]);
  });

  it("returns empty slots when nobody is there", () => {
    expect(new SlotAssigner().assign([], 0)).toEqual([null, null]);
    expect(new SlotAssigner({ slots: 1 }).assign([], 0)).toEqual([null]);
  });
});
