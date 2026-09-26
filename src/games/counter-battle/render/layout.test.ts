import { describe, expect, it } from "vitest";
import { splitPanes } from "./layout";

const area = (panes: ReturnType<typeof splitPanes>) => panes.reduce((sum, p) => sum + p.rect.w * p.rect.h, 0);

describe("the split screen", () => {
  it("gives the television camera the screen when nobody plays, and one player all of it", () => {
    expect(splitPanes([])).toEqual([{ fighter: null, rect: { x: 0, y: 0, w: 1, h: 1 } }]);
    expect(splitPanes([{ id: 3, team: 1 }])).toEqual([{ fighter: 3, rect: { x: 0, y: 0, w: 1, h: 1 } }]);
  });

  it("puts two players side by side, pink on the left", () => {
    const panes = splitPanes([{ id: 1, team: 1 }, { id: 0, team: 0 }]);
    expect(panes.map((p) => [p.fighter, p.rect.x])).toEqual([[0, 0], [1, 0.5]]);
    expect(area(panes)).toBeCloseTo(1);
  });

  it("keeps teammates in one column with four players", () => {
    const panes = splitPanes([{ id: 0, team: 0 }, { id: 1, team: 1 }, { id: 2, team: 0 }, { id: 3, team: 1 }]);
    const x = (id: number) => panes.find((p) => p.fighter === id)!.rect.x;
    expect([x(0), x(2)]).toEqual([0, 0]);
    expect([x(1), x(3)]).toEqual([0.5, 0.5]);
    expect(area(panes)).toBeCloseTo(1);
  });

  it("fills the spare quarter of a three way split with the television camera", () => {
    const panes = splitPanes([{ id: 0, team: 0 }, { id: 1, team: 0 }, { id: 2, team: 1 }]);
    expect(panes).toHaveLength(4);
    expect(panes.filter((p) => p.fighter === null)).toEqual([{ fighter: null, rect: { x: 0.5, y: 0.5, w: 0.5, h: 0.5 } }]);
    expect(area(panes)).toBeCloseTo(1);
    // No two panes overlap.
    const keys = new Set(panes.map((p) => `${p.rect.x},${p.rect.y}`));
    expect(keys.size).toBe(4);
  });
});
