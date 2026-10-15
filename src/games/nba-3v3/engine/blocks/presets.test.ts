import { describe, expect, it } from "vitest";
import { BLOCK_PRESETS, dunkPreset, hitFor, pickPreset, type BlockRead } from "./presets";

/** A clean two hand touch at the rim on a layup from in front, unless a test says otherwise. */
const read = (r: Partial<BlockRead> = {}): BlockRead => ({
  jump: "stand",
  kind: "layup",
  three: false,
  touch: true,
  grazing: false,
  glass: false,
  rimGap: 0.8,
  strong: true,
  roll: 0.1,
  ...r,
});

describe("block preset selection", () => {
  it("shows a hand that never gets there as the contest that just misses, whatever the leap", () => {
    for (const jump of ["stand", "run", "chase", "help", "closeout"] as const) expect(pickPreset(read({ jump, touch: false }))).toBe("miss");
  });

  it("calls a touch that only grazes the ball a fingertip tip", () => {
    expect(pickPreset(read({ kind: "jumper", rimGap: 4.5, grazing: true }))).toBe("tip");
    expect(pickPreset(read({ grazing: true, glass: true }))).toBe("tip");
  });

  it("plays the leap the body is already in: the chase down from behind, the closeout at a deep shooter", () => {
    expect(pickPreset(read({ jump: "chase" }))).toBe("chase");
    expect(pickPreset(read({ jump: "chase", glass: true }))).toBe("chase");
    expect(pickPreset(read({ jump: "closeout", kind: "jumper", rimGap: 5.8 }))).toBe("closeout");
    // A three blocked from a standing jump is still played as the closeout leap.
    expect(pickPreset(read({ kind: "jumper", three: true, rimGap: 7 }))).toBe("closeout");
  });

  it("pins a layup by the glass, but never a jumper", () => {
    expect(pickPreset(read({ glass: true }))).toBe("pin");
    expect(pickPreset(read({ jump: "help", glass: true }))).toBe("pin");
    expect(pickPreset(read({ kind: "jumper", glass: true, rimGap: 1 }))).not.toBe("pin");
  });

  it("brings the weak side help across, and stuffs a dunk with both hands", () => {
    expect(pickPreset(read({ jump: "help" }))).toBe("help");
    expect(pickPreset(read({ kind: "dunk", roll: 0.99 }))).toBe("rejection");
  });

  it("at the rim picks the two hand rejection or the one hand swat, a strong man stuffing it more often", () => {
    expect(pickPreset(read({ roll: 0.6, strong: true }))).toBe("rejection");
    expect(pickPreset(read({ roll: 0.6, strong: false }))).toBe("swat");
    expect(pickPreset(read({ roll: 0.9, strong: true }))).toBe("swat");
    expect(pickPreset(read({ roll: 0.1, strong: false }))).toBe("rejection");
  });

  it("swats a jumper inside the arc into the stands", () => {
    expect(pickPreset(read({ kind: "jumper", rimGap: 4.2 }))).toBe("swat");
    expect(pickPreset(read({ jump: "run", kind: "jumper", rimGap: 3, roll: 0 }))).toBe("swat");
  });

  it("can reach every preset", () => {
    const seen = new Set<string>();
    for (const jump of ["stand", "run", "chase", "help", "closeout"] as const)
      for (const kind of ["jumper", "layup", "dunk"] as const)
        for (const touch of [true, false])
          for (const grazing of [true, false])
            for (const glass of [true, false])
              for (const rimGap of [0.5, 4]) for (const roll of [0.1, 0.9]) seen.add(pickPreset(read({ jump, kind, touch, grazing, glass, rimGap, roll, three: rimGap > 3 })));
    expect([...seen].sort()).toEqual([...BLOCK_PRESETS].sort());
  });

  it("gives each preset its hand on the ball", () => {
    expect(hitFor("rejection", false)).toBe("reject");
    expect(hitFor("swat", false)).toBe("stands");
    expect(hitFor("chase", true)).toBe("pin");
    expect(hitFor("chase", false)).toBe("swat");
    expect(hitFor("help", false)).toBe("swat");
    expect(hitFor("pin", true)).toBe("pin");
    expect(hitFor("tip", false)).toBe("tip");
    expect(hitFor("closeout", false)).toBe("deflect");
    expect(dunkPreset("chase")).toBe("chase");
    expect(dunkPreset("run")).toBe("rejection");
  });
});
