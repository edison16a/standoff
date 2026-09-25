import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../engine/events";
import { HALF_HEIGHT } from "../engine/tuning";
import { ICON, ICON_AT } from "./icon-script";
import { LOOP } from "./loop-script";
import { ShowcaseScene } from "./scene";

const STEP = 1 / 120;

/** Plays a script to `until` and keeps what happened from `from` on, with film times. */
function play(script = LOOP, from = 0, until = 24): { t: number; event: MatchEvent }[] {
  const scene = new ShowcaseScene(script, HALF_HEIGHT * (16 / 9));
  const out: { t: number; event: MatchEvent }[] = [];
  while (scene.time < until) {
    for (const event of scene.step(STEP)) if (scene.time >= from) out.push({ t: scene.time, event });
  }
  return out;
}

/** What happened, as short text, with times inside the period. */
function story(events: { t: number; event: MatchEvent }[], period: number): string[] {
  return events
    .filter(({ event }) => event.type !== "spawn" && event.type !== "gone" && event.type !== "swipe")
    .map(({ t, event }) => `${(t % period).toFixed(2)} ${event.type} ${"body" in event ? event.body.kind : ""} ${"seat" in event ? event.seat : ""}`);
}

describe("the showcase loop", () => {
  const filmed = play(LOOP, 16, 24);
  const cuts = filmed.map(({ event }) => event.type);

  it("cuts every throw in the period it films", () => {
    const hits = new Set(filmed.flatMap(({ event }) => (event.type === "slice" || event.type === "burst" || event.type === "bomb" ? [event.body.kind] : [])));
    for (const spec of LOOP.throws) expect(hits, spec.id).toContain(spec.kind);
  });

  it("shows a combo, a smashed giant melon, a rare fruit and a bomb", () => {
    expect(filmed.some(({ event }) => event.type === "score" && event.reason === "combo")).toBe(true);
    expect(cuts.filter((type) => type === "hit")).toHaveLength(6);
    expect(cuts).toContain("burst");
    expect(filmed.some(({ event }) => event.type === "score" && event.reason === "rare")).toBe(true);
    expect(cuts).toContain("bomb");
  });

  it("does the same in every period, so the clip joins up", () => {
    expect(story(play(LOOP, 24, 32), LOOP.period)).toEqual(story(filmed, LOOP.period));
  });
});

describe("the showcase icon", () => {
  it("cuts the watermelon just before its moment", () => {
    const events = play(ICON, 0, ICON_AT);
    const kinds = events.flatMap(({ event }) => (event.type === "slice" ? [event.body.kind] : []));
    expect(kinds).toEqual(["orange", "watermelon"]);
    const melon = events.find(({ event }) => event.type === "slice" && event.body.kind === "watermelon")!;
    expect(ICON_AT - melon.t).toBeLessThan(0.15);
  });
});
