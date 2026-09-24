import { describe, expect, it } from "vitest";
import { alive } from "../engine/zombie";
import { ShowcaseDirector } from "./director";
import { PLANS } from "./plans";

const react = { react: () => undefined };

/** Runs a director to `seconds` of its own time, one 60th of a second per frame. */
function runTo(director: ShowcaseDirector, seconds: number): void {
  for (let ms = 0; ms <= seconds * 1000; ms += 1000 / 60) director.update(ms, react);
}

const boss = (director: ShowcaseDirector) => director.game.encounter?.zombies.find((z) => z.weak.length > 0 && alive(z));

describe("the showcase", () => {
  it("stages the same fight every time, so a capture replays exactly", () => {
    const a = new ShowcaseDirector(PLANS.loop);
    const b = new ShowcaseDirector(PLANS.loop);
    runTo(a, 6);
    runTo(b, 6);
    const where = (d: ShowcaseDirector) => d.game.encounter?.zombies.map((z) => [z.id, z.kind, z.ahead.toFixed(4), z.side.toFixed(4)]);
    expect(where(a)).toEqual(where(b));
    expect(where(a)?.length).toBeGreaterThan(2);
  });

  it("brings the boss back to the same spot on every beat, so the clip loops", () => {
    const plan = PLANS.loop;
    const director = new ShowcaseDirector(plan);
    const seen: number[] = [];
    for (let beat = 2; beat <= 5; beat++) {
      // Just before each beat's volley, the boss has walked in the same way.
      runTo(director, beat * plan.beat - plan.preroll - 0.05);
      seen.push(boss(director)!.ahead);
    }
    for (const ahead of seen.slice(1)) expect(ahead).toBeCloseTo(seen[0]!, 1);
    expect(boss(director)!.ahead).toBeLessThan(plan.bossAt);
  });

  it("never lets the team fall or the boss drop", () => {
    const director = new ShowcaseDirector(PLANS.icon);
    runTo(director, 20);
    expect(director.game.phase).toBe("fight");
    expect(boss(director)).toBeDefined();
  });
});
