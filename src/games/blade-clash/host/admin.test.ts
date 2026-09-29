import { describe, expect, it } from "vitest";
import { COUNTDOWN_SECONDS } from "@/games/blade-clash/engine/rules";
import { DEFAULT_TUNING } from "@/games/blade-clash/tuning";
import { adminActions } from "@/platform/admin/admin-actions";
import { registerBladeAdmin } from "./admin";
import { MatchDriver } from "./match-driver";

describe("Blade Clash admin shortcuts", () => {
  it("offers a point to each player while the match runs, against a computer that stands still in Training", () => {
    const driver = new MatchDriver({ 1: "knight", 2: "samurai" }, () => DEFAULT_TUNING, { director: null, feedback: () => undefined, onPhase: () => undefined }, { slot: 2, level: () => "training" });
    const drop = registerBladeAdmin(driver, () => ({ 1: "Ada", 2: "Computer" }));
    expect(adminActions().map((action) => action.label)).toEqual(["Point to Ada", "Point to Computer"]);
    driver.start();
    let wall = 0;
    for (; wall < COUNTDOWN_SECONDS * 1000 + 200; wall += 50) driver.tick(wall);
    const start = driver.engine.fighters[2].x;
    adminActions()[0]!.run();
    expect(driver.hud()).toMatchObject({ phase: "point", scorer: 1, score: { 1: 1, 2: 0 } });
    for (; wall < 12_000; wall += 50) driver.tick(wall);
    expect(driver.engine.phase).toBe("live");
    expect(driver.engine.fighters[2].x).toBe(start);
    drop();
    expect(adminActions()).toEqual([]);
  });
});
