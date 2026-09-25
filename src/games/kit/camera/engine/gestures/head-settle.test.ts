import { describe, expect, it } from "vitest";
import { readMoves, type ReadFrame } from "../sequence";
import type { PoseSpec } from "../synthetic";
import type { PoseKey } from "../timeline";

const kinds = (frames: ReadFrame[]) => frames.flatMap((f) => f.events.map((e) => e.type)).filter((type) => type !== "back");

/** A quick jump then a held duck, starting at `at`, from wherever the player now rests. */
const jumpThenDuck = (rest: PoseSpec, at: number): PoseKey[] => {
  const down = { ...rest, crouch: (rest.crouch ?? 0) + 0.5 };
  return [
    { at, pose: rest },
    { at: at + 150, pose: { ...rest, lift: 0.22 } },
    { at: at + 400, pose: rest },
    { at: at + 1200, pose: rest },
    { at: at + 1450, pose: down },
    { at: at + 1900, pose: down },
    { at: at + 2150, pose: rest },
    { at: at + 3000, pose: rest },
  ];
};

describe("standing up or sitting down between rounds", () => {
  it("takes a player who sat down as a new resting height, and reads moves from there", () => {
    const seated: PoseSpec = { crouch: 0.45 };
    const keys: PoseKey[] = [{ at: 0, pose: {} }, { at: 700, pose: seated }, ...jumpThenDuck(seated, 8000)];
    const frames = readMoves(keys);
    // Sitting down reads as a duck at first, then ends on its own once it lasts too long to be one.
    expect(kinds(frames)).toEqual(["duck", "stand", "jump", "land", "duck", "stand"]);
    const settled = frames.find((f) => f.body.time > 7900)!;
    expect(Math.abs(settled.state.head.rise)).toBeLessThan(0.1);
  });

  it("takes a player who stood up quickly as a new resting height, so jumps keep working", () => {
    const seated: PoseSpec = { crouch: 0.45 };
    const keys: PoseKey[] = [{ at: 0, pose: seated }, { at: 700, pose: {} }, ...jumpThenDuck({}, 6000)];
    expect(kinds(readMoves(keys, seated))).toEqual(["jump", "land", "jump", "land", "duck", "stand"]);
  });

  it("never cuts a real held duck short", () => {
    const hold: PoseKey[] = [{ at: 0, pose: {} }, { at: 200, pose: { crouch: 0.6 } }, { at: 3000, pose: { crouch: 0.6 } }, { at: 3300, pose: {} }];
    const frames = readMoves(hold);
    expect(kinds(frames)).toEqual(["duck", "stand"]);
    expect(frames.find((f) => f.events.some((e) => e.type === "stand"))!.body.time).toBeGreaterThan(3000);
  });

  it("waits for enough frames first, since a slow machine may see one jump in a few frames seconds apart", () => {
    const held: PoseKey[] = [{ at: 0, pose: {} }, { at: 100, pose: { lift: 0.2 } }, { at: 5000, pose: { lift: 0.2 } }, { at: 5100, pose: {} }];
    expect(kinds(readMoves(held, {}, { fps: 1, tail: 1500 }))).toEqual(["jump", "land"]);
  });
});
