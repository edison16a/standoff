import { describe, expect, it } from "vitest";
import { alive } from "../engine/zombie";
import type { TargetPoint } from "../render/scene-source";
import { ShowcaseDirector } from "./director";
import { PLANS } from "./plans";
import { assignTargets, lanes, type Shooter } from "./targeting";

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

const head = (zombie: number, x: number, distance = 12): TargetPoint => ({ zombie, part: "head", weak: null, x, y: 0.1, distance });
const team = (count: number): Shooter[] =>
  lanes(count).map((lane, i) => ({ seat: i + 1, role: i < 2 ? "escort" : "boss", lane, held: null }));

/** A stand in for the renderer: every standing zombie as a point on screen, from where it walks. */
function fakeView(director: ShowcaseDirector) {
  const targets = (): TargetPoint[] =>
    (director.game.encounter?.zombies ?? []).filter(alive).flatMap((z): TargetPoint[] => {
      const at = { x: Math.max(-0.9, Math.min(0.9, z.side / Math.max(2, z.ahead))), distance: z.ahead };
      if (!z.weak.length) return [{ zombie: z.id, part: "head", weak: null, y: 0.2, ...at }];
      return z.weak.map((_, i) => ({ zombie: z.id, part: "weak", weak: i, y: 0.1 * i, ...at }));
    });
  // Every pellet strikes the nearest hit shape under the aim, as the renderer's raycast would.
  const cast = (_seat: number, aim: { x: number; y: number }, offsets: readonly unknown[]) => {
    const under = targets()
      .filter((t) => Math.hypot(t.x - aim.x, t.y - aim.y) < 0.06)
      .sort((a, b) => a.distance - b.distance)[0];
    return offsets.map(() => (under ? { zombie: under.zombie, part: under.part, weak: under.weak } : null));
  };
  return { targets, cast, shotFx: () => undefined };
}

describe("the showcase players", () => {
  it("each take a different zombie, from left to right", () => {
    const zombies = [head(1, 0.7), head(2, -0.7), head(3, 0.1), head(4, -0.2), head(5, 0.3, 30)];
    const picks = assignTargets(team(4), zombies, 0);
    const ids = [1, 2, 3, 4].map((seat) => picks.get(seat)!.zombie);
    expect(new Set(ids).size).toBe(4);
    // The leftmost player takes the leftmost zombie, and so on across the screen.
    expect(ids).toEqual([2, 4, 3, 1]);
  });

  it("share a zombie only when there are too few to go round", () => {
    const picks = assignTargets(team(4), [head(1, -0.5), head(2, 0.5)], 0);
    const ids = [...picks.values()].map((t) => t.zombie);
    expect(ids).toHaveLength(4);
    expect(new Set(ids)).toEqual(new Set([1, 2]));
  });

  it("keep their own zombie rather than trade for one a little nearer their side", () => {
    const shooters = team(2).map((s, i) => ({ ...s, held: i === 0 ? 2 : 1 }));
    const picks = assignTargets(shooters, [head(1, -0.02), head(2, 0.02)], 0);
    expect(picks.get(1)!.zombie).toBe(2);
    expect(picks.get(2)!.zombie).toBe(1);
  });

  it("find the cheapest pairing even when a later player's bonus would win it back", () => {
    // Player 2 holds the near zombie on its side. The search must not stop early on the first pairing it finds.
    const shooters = team(2).map((s) => ({ ...s, held: s.seat === 2 ? 1 : null }));
    const picks = assignTargets(shooters, [head(1, 0.6, 3), head(2, 0.9, 7.5)], 0);
    expect(picks.get(1)!.zombie).toBe(2);
    expect(picks.get(2)!.zombie).toBe(1);
  });

  it("never aim at the same zombie while others stand free, and hit only their own", () => {
    for (const plan of [PLANS.loop, PLANS.icon]) {
      const director = new ShowcaseDirector(plan);
      const view = fakeView(director);
      let checked = 0;
      let frames = 0;
      let hits = 0;
      for (let ms = 0; ms <= 12_000; ms += 1000 / 30) {
        director.update(ms, react);
        director.shoot(view, 1 / 30);
        frames++;
        for (const event of director.game.drain()) {
          if (event.type !== "hit") continue;
          expect(event.zombie).toBe(director.targetOf(event.seat));
          hits++;
        }
        const standing = new Set(view.targets().map((t) => t.zombie)).size;
        const aimed = plan.players.map((_, i) => director.targetOf(i + 1)).filter((id) => id !== null);
        if (standing < plan.players.length) continue;
        expect(aimed).toHaveLength(plan.players.length);
        expect(new Set(aimed).size).toBe(plan.players.length);
        checked++;
      }
      // The street stays busy enough that nearly every frame has a zombie for each player.
      expect(checked).toBeGreaterThan(frames * 0.9);
      expect(hits).toBeGreaterThan(20);
    }
  });
});
