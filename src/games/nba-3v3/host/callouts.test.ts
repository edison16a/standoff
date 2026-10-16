import { describe, expect, it } from "vitest";
import { Match, type Entry } from "../engine/match";
import { BUILD_IDS } from "../builds";
import { banner } from "./callouts";

const ENTRIES: Entry[] = BUILD_IDS.slice(0, 6).map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: null }));
const m = new Match({ entries: ENTRIES, seed: 1, firstOffence: 0 });
const nameOf = (id: number) => `P${id}`;

describe("the big screen banners", () => {
  it("say nothing when a man is knocked down, so the dunk going in is seen", () => {
    expect(banner({ type: "knockdown", id: 1, by: 0 }, m, nameOf, 0)).toBeNull();
  });

  it("say nothing for a dunk or a basket", () => {
    expect(banner({ type: "dunk", id: 0, style: "tomahawk", power: 1 }, m, nameOf, 0)).toBeNull();
    expect(banner({ type: "score", team: 0, points: 2, id: 0, kind: "dunk", outcome: "swish", assist: null, streak: 1, dunk: "tomahawk" }, m, nameOf, 0)).toBeNull();
  });

  it("still call a block, game point and the win", () => {
    expect(banner({ type: "block", id: 1, victim: 0, tip: false, at: { x: 0, y: 3, z: 1 }, hit: "reject", preset: "rejection" }, m, nameOf, 0)?.sub).toBe("P1");
    expect(banner({ type: "gamePoint", team: 1 }, m, nameOf, 0)?.text).toBe("GAME POINT");
    expect(banner({ type: "win", team: 0 }, m, nameOf, 0)?.tone).toBe("team0");
  });
});
