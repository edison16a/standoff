import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../builds";
import { cheerFor, startCheer } from "./celebrate";
import { Match, type Entry } from "./match";
import { freshTrack } from "./physics/shot-watch";
import type { ShotInfo } from "./types";

const ENTRIES: Entry[] = BUILD_IDS.slice(0, 6).map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: null }));

function shot(patch: Partial<ShotInfo>): ShotInfo {
  return { shooter: 0, team: 0, points: 2, kind: "jumper", dunk: null, grade: "good", outcome: "swish", made: true, counted: true, touchedRim: false, assist: null, contest: 0, distance: 4, track: freshTrack(), rolled: [], ...patch };
}

describe("celebrations after big baskets", () => {
  it("pats a smaller man on the head after a dunk on him, and signs the sleep or the shush after a deep three", () => {
    const m = new Match({ entries: ENTRIES, seed: 2 });
    const a = m.athletes[0]!;
    Object.assign(a, { x: 0, z: 2 });
    Object.assign(m.athletes[1]!, { x: 0.6, z: 2.3 });
    const dunks = new Set(Array.from({ length: 30 }, () => cheerFor(m, shot({ kind: "dunk" }), a, false)));
    expect(dunks.has("tooSmall")).toBe(true);
    const threes = new Set(Array.from({ length: 30 }, () => cheerFor(m, shot({ points: 3, distance: 8.2 }), a, false)));
    expect([...threes].every((g) => g === "sleep" || g === "shush")).toBe(true);
    expect(cheerFor(m, shot({ points: 2, distance: 4 }), a, false)).toBeNull();
  });

  it("waits for the feet to touch down before the gesture starts", () => {
    const m = new Match({ entries: ENTRIES, seed: 2 });
    const a = m.athletes[0]!;
    a.cheer = "tooSmall";
    a.y = 0.6;
    startCheer(a, false);
    expect(a.action.kind).toBe("none");
    a.y = 0;
    startCheer(a, false);
    expect(a.action).toMatchObject({ kind: "celebrate", gesture: "tooSmall" });
    expect(a.cheer).toBeNull();
  });
});
