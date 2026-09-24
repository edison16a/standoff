import { describe, expect, it } from "vitest";
import { Achievements } from "./achievements";
import type { GameEvent } from "./events";
import { SurvivalGame } from "./game";
import { Gun } from "./gun";
import type { CastFn } from "./shooting";
import { emptyStats } from "./stats";
import { alive } from "./zombie";

const DT = 1 / 60;

function run(game: SurvivalGame, seconds: number, until?: () => boolean): void {
  for (let t = 0; t < seconds; t += DT) {
    game.update(DT);
    if (until?.()) return;
  }
}

/** Lets the dead walk in unopposed until the team falls. */
function fallDown(game: SurvivalGame): void {
  run(game, 20, () => game.phase === "fight");
  run(game, 600, () => game.phase === "down");
}

describe("a gun that is refilled", () => {
  it("drops a reload it was asked for, so a full gun does not play one", () => {
    const gun = new Gun("ak47");
    gun.trigger(0);
    expect(gun.startReload()).toBe(true);
    gun.refill();
    expect(gun.update(0.1)).toEqual([]);
    expect(gun.reloading).toBe(false);
  });
});

describe("a fallen team", () => {
  it("cannot start a reload that would play out after the retry", () => {
    const game = new SurvivalGame();
    game.start([{ seat: 1, weapon: "rifle" }]);
    fallDown(game);
    expect(game.phase).toBe("down");
    game.squad.get(1)!.gun.ammo = 3;
    game.reload(1);
    game.retry();
    game.drain();
    game.update(DT);
    expect(game.drain().some((e) => e.type === "reload-start")).toBe(false);
    expect(game.squad.get(1)!.gun.ammo).toBe(30);
  });
});

describe("a seat taken by someone new", () => {
  it("does not hand them the last player's gun or numbers", () => {
    const game = new SurvivalGame();
    game.start([{ seat: 1, weapon: "rifle" }, { seat: 2, weapon: "smg" }]);
    run(game, 20, () => game.phase === "fight");
    game.squad.get(2)!.stats.kills = 7;
    game.release(2);
    expect(game.squad.get(2)).toBeUndefined();
    game.join(2, "shotgun");
    expect(game.squad.get(2)!.stats.kills).toBe(0);
    expect(game.squad.get(2)!.gun.weapon).toBe("shotgun");
  });
});

describe("two for one", () => {
  it("counts kills per shot, however many shots came before", () => {
    const events: GameEvent[] = [];
    const awards = new Achievements((e) => events.push(e));
    const stats = emptyStats();
    const lookup = () => stats;
    const kill = (zombie: number): GameEvent => ({ type: "kill", seat: 1, zombie, kind: "walker", head: false });
    // Many single kills from many shots never earn it.
    for (let shot = 1; shot <= 100; shot++) awards.observe(kill(shot), lookup, 1, shot);
    expect(events.some((e) => e.type === "achievement" && e.id === "two-for-one")).toBe(false);
    awards.observe(kill(500), lookup, 1, 101);
    awards.observe(kill(501), lookup, 1, 101);
    expect(events.some((e) => e.type === "achievement" && e.id === "two-for-one")).toBe(true);
  });
});

describe("a held trigger", () => {
  it("sends one dry click for an empty gun, not one per pull through the reload", () => {
    const game = new SurvivalGame();
    game.start([{ seat: 1, weapon: "smg" }]);
    run(game, 20, () => game.phase === "fight");
    const miss: CastFn = (offsets) => offsets.map(() => null);
    game.squad.get(1)!.gun.ammo = 1;
    let dry = 0;
    for (let i = 0; i < 40; i++) {
      game.fire(1, miss);
      game.update(0.05);
      dry += game.drain().filter((e) => e.type === "dry").length;
    }
    expect(dry).toBe(1);
    expect(game.encounter?.zombies.some(alive)).toBe(true);
  });
});
