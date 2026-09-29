import { describe, expect, it } from "vitest";
import { Encounter } from "./encounter";
import type { GameEvent } from "./events";
import { Rng } from "./rng";
import { Spawner, teamCount, teamRush, type SpawnOrder } from "./spawner";
import { stage } from "./stages";
import { alive } from "./zombie";
import { isBoss } from "./zombie-kinds";

const DT = 1 / 30;

/** Runs a spawner on its own for some seconds with an empty field, or one of the caller's making. */
function orders(index: number, seconds: number, field = () => ({ standing: 0, bossAhead: null as number | null })): { at: number; order: SpawnOrder }[] {
  const spawner = new Spawner(stage(index), 1, new Rng(3), 0.5);
  const out: { at: number; order: SpawnOrder }[] = [];
  for (let t = 0; t < seconds; t += DT) for (const order of spawner.step(DT, field())) out.push({ at: t, order });
  return out;
}

describe("the spawner", () => {
  it("lets part of the crowd come before a mini boss steps out", () => {
    const list = orders(2, 30).map((o) => o.order.kind);
    const boss = list.indexOf("butcher");
    expect(boss).toBe(stage(2).bossAt[0]);
    expect(list.filter((k) => k === "butcher")).toHaveLength(1);
    expect(list.length).toBe(teamCount(stage(2), 1) + 1);
  });

  it("brings two mini bosses on the last mini boss stage, one after the other", () => {
    const list = orders(14, 60).map((o) => o.order.kind);
    const bosses = list.filter(isBoss);
    expect(bosses).toEqual(["butcher", "hook"]);
    expect(list.indexOf("hook")).toBeGreaterThan(list.indexOf("butcher") + 3);
  });

  it("sends a big boss out alone, then runners in rushes behind it", () => {
    const spec = stage(10);
    const list = orders(10, 60, () => ({ standing: 0, bossAhead: 20 }));
    expect(list[0]!.order.kind).toBe("tank");
    const rushers = list.slice(1);
    expect(rushers.every((o) => o.order.kind === "runner" && o.order.rush)).toBe(true);
    expect(rushers).toHaveLength(teamCount(spec, 1));
    // Each rush comes at once, well behind the boss.
    const first = rushers.filter((o) => o.at === rushers[0]!.at);
    expect(first).toHaveLength(teamRush(spec, 1));
    for (const o of first) expect(o.order.ahead).toBeGreaterThan(20);
    // And the next waits its turn.
    const next = rushers.find((o) => o.at > rushers[0]!.at)!;
    expect(next.at - rushers[0]!.at).toBeCloseTo(spec.rush!.every, 1);
  });

  it("hurries the last runners in once the big boss is down", () => {
    const standing = orders(15, 60, () => ({ standing: 0, bossAhead: 20 }));
    const fallen = orders(15, 60, () => ({ standing: 0, bossAhead: null }));
    expect(fallen).toHaveLength(standing.length);
    expect(fallen.at(-1)!.at).toBeLessThan(standing.at(-1)!.at / 2);
  });

  it("never lets more of the crowd stand than the stage allows", () => {
    const spec = stage(6);
    const list = orders(6, 30, () => ({ standing: spec.maxAlive, bossAhead: null }));
    expect(list).toHaveLength(0);
  });
});

describe("an encounter", () => {
  it("counts the bosses still to come in what remains, and calls a rush", () => {
    const encounter = new Encounter(stage(5), 1, 11, 1);
    expect(encounter.remaining).toBe(teamCount(stage(5), 1) + 1);
    const events: GameEvent[] = [];
    for (let t = 0; t < 30; t += DT) encounter.update(DT, (e) => events.push(e));
    expect(events.some((e) => e.type === "spawn" && e.kind === "juggernaut")).toBe(true);
    expect(events.some((e) => e.type === "rush")).toBe(true);
    // Rushers fan out across the road rather than bunching in one file.
    const runners = encounter.zombies.filter((z) => alive(z) && z.kind === "runner");
    const sides = runners.map((z) => z.targetSide);
    expect(Math.max(...sides) - Math.min(...sides)).toBeGreaterThan(1);
  });
});
