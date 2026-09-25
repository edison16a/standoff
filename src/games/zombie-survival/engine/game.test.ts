import { describe, expect, it } from "vitest";
import { teamCount } from "./encounter";
import { SurvivalGame } from "./game";
import { CLEAR_SECONDS, STORY_CLEAR_SECONDS } from "./pacing";
import type { CastFn } from "./shooting";
import { stage } from "./stages";
import { alive } from "./zombie";
import { KINDS } from "./zombie-kinds";

const DT = 1 / 60;

/** A perfect shot: every bullet finds the nearest standing zombie, on a weak point if it has one. */
function sniper(game: SurvivalGame, part: "head" | "body" = "head"): CastFn {
  return (offsets) =>
    offsets.map(() => {
      const target = game.encounter?.zombies.filter(alive).sort((a, b) => a.ahead - b.ahead)[0];
      if (!target) return null;
      const weak = target.weak.findIndex((hp) => hp > 0);
      return weak >= 0 ? { zombie: target.id, part: "weak", weak } : { zombie: target.id, part, weak: null };
    });
}

const miss: CastFn = (offsets) => offsets.map(() => null);

function run(game: SurvivalGame, seconds: number, each?: () => void, until?: () => boolean): void {
  for (let t = 0; t < seconds; t += DT) {
    each?.();
    game.update(DT);
    if (until?.()) return;
  }
}

/** Runs until the fight at hand is won or lost. */
const settled = (game: SurvivalGame) => () => game.phase === "clear" || game.phase === "down";

describe("a run", () => {
  it("walks to the first checkpoint and starts the fight", () => {
    const game = new SurvivalGame();
    game.start([{ seat: 1, weapon: "rifle" }]);
    expect(game.phase).toBe("travel");
    run(game, 20);
    expect(game.phase).toBe("fight");
  });

  it("clears a stage with good aim, heals and moves on", () => {
    const game = new SurvivalGame();
    game.start([{ seat: 1, weapon: "rifle" }]);
    run(game, 20);
    const cast = sniper(game);
    run(game, 60, () => game.fire(1, cast), settled(game));
    expect(game.phase).toBe("clear");
    const stats = game.squad.get(1)!.stats;
    expect(stats.kills).toBe(teamCount(stage(1), 1));
    expect(stats.headshots).toBeGreaterThan(0);
    // A short breather to reload, then straight on to the next fight.
    run(game, CLEAR_SECONDS + 0.1, undefined, () => game.phase === "travel");
    expect(game.phase).toBe("travel");
    expect(game.stage).toBe(2);
  });

  it("stops longer only where the story needs it", () => {
    const game = new SurvivalGame();
    game.start([{ seat: 1, weapon: "rifle" }], 10);
    run(game, 20);
    const cast = sniper(game);
    let tick = 0;
    run(game, 200, () => (tick++ % 6 === 0 ? game.fire(1, cast) : undefined), settled(game));
    expect(game.phase).toBe("clear");
    run(game, CLEAR_SECONDS + 0.1);
    expect(game.phase).toBe("clear");
    run(game, STORY_CLEAR_SECONDS - CLEAR_SECONDS);
    expect(game.phase).toBe("cutscene");
  });

  it("falls when nobody hits anything, then retries the same fight", () => {
    const game = new SurvivalGame();
    game.start([{ seat: 1, weapon: "smg" }], 4);
    run(game, 400, () => game.fire(1, miss));
    expect(game.phase).toBe("down");
    game.retry();
    expect(game.phase).toBe("fight");
    expect(game.stage).toBe(4);
    expect(game.health).toBeGreaterThanOrEqual(50);
  });

  it("beats every boss stage with steady aim on the weak points", () => {
    for (const stage of [5, 10, 15, 20, 25]) {
      const game = new SurvivalGame();
      game.start([{ seat: 1, weapon: "rifle" }, { seat: 2, weapon: "shotgun" }], stage);
      run(game, 20);
      const cast = sniper(game);
      // Pull the trigger now and then, as a person would, not every frame.
      let tick = 0;
      run(game, 240, () => {
        tick += 1;
        if (tick % 8 === 0) game.fire(1, cast);
        if (tick % 30 === 0) game.fire(2, cast);
      }, settled(game));
      expect(game.phase, `stage ${stage}`).not.toBe("down");
      expect(game.phase, `stage ${stage}`).toBe("clear");
    }
  });

  it("plays the chopper crash after stage 10 and heads for the docks", () => {
    const game = new SurvivalGame();
    game.start([{ seat: 1, weapon: "ak47" }], 10);
    run(game, 20);
    const cast = sniper(game);
    let tick = 0;
    run(game, 200, () => (tick++ % 6 === 0 ? game.fire(1, cast) : undefined), () => game.phase === "travel");
    const phases = game.drain().filter((e) => e.type === "phase").map((e) => (e.type === "phase" ? e.phase : ""));
    expect(phases).toContain("cutscene");
    expect(game.stage).toBe(11);
  });

  it("keeps a crowd at the front line in view, so every one can be shot", () => {
    const game = new SurvivalGame();
    game.start([1, 2, 3, 4].map((seat) => ({ seat, weapon: "rifle" as const })), 25);
    let widest = 0;
    let attacking = 0;
    run(game, 90, () => {
      game.health = 100;
      for (const z of game.encounter?.zombies.filter(alive) ?? []) {
        widest = Math.max(widest, Math.abs(z.side) / z.ahead);
        if (z.state === "attack") attacking += 1;
      }
    });
    expect(attacking).toBeGreaterThan(0);
    // The camera sees about 0.9 to either side per metre ahead on a wide screen.
    expect(widest).toBeLessThan(0.75);
  });

  it("lets a player leave and come back with their stats", () => {
    const game = new SurvivalGame();
    game.start([{ seat: 1, weapon: "rifle" }, { seat: 2, weapon: "smg" }]);
    run(game, 20);
    game.fire(2, sniper(game));
    game.setPresent(2, false);
    expect(game.fire(2, sniper(game))).toBe(false);
    game.join(2, "smg");
    expect(game.squad.get(2)!.stats.shots).toBe(1);
  });

  it("keeps the boss table sane", () => {
    for (const kind of ["butcher", "tank", "juggernaut", "behemoth"] as const) {
      expect(KINDS[kind].weakPoints.length).toBeGreaterThan(0);
    }
  });
});
