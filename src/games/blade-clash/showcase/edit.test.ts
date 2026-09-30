import { describe, expect, it } from "vitest";
import type { GameEvent } from "@/games/blade-clash/engine/events";
import { MatchDriver } from "@/games/blade-clash/host/match-driver";
import { DEFAULT_TUNING } from "@/games/blade-clash/tuning";
import { Choreography, OPENING_SCORE } from "./choreography";
import { CYCLE_S, duelAt, TAKES } from "./edit";

/** Plays the showcase duel as the director does and lists each event with the duel's clock, in seconds. */
function play(untilS: number): { s: number; event: GameEvent }[] {
  const driver = new MatchDriver({ 1: "knight", 2: "star" }, () => DEFAULT_TUNING, { director: null, feedback: () => undefined, onPhase: () => undefined });
  const choreography = new Choreography();
  const happened: { s: number; event: GameEvent }[] = [];
  let wall = 0;
  driver.listen((event) => happened.push({ s: wall / 1000, event }));
  driver.start();
  driver.engine.match.score = { ...OPENING_SCORE };
  for (let t = -3200; t <= 0; t += 1000 / 30) driver.tick(t);
  const fightAt = driver.engine.now;
  for (wall = 0; wall < untilS * 1000; wall += 1000 / 30) {
    choreography.drive(driver.engine, driver.engine.now - fightAt);
    driver.tick(wall);
  }
  return happened;
}

/** Whether the trailer shows the duel at `s` seconds, and in which take. */
function shownIn(s: number): number {
  return TAKES.findIndex((take, i) => {
    const end = (TAKES[i + 1]?.at ?? CYCLE_S) - take.at;
    return s >= take.duel && s < take.duel + end;
  });
}

describe("the trailer's edit", () => {
  const happened = play(12);
  const first = (type: GameEvent["type"], nth = 0) => happened.filter((h) => h.event.type === type)[nth]!.s;

  it("keeps the first clash and the first cut in the first take", () => {
    expect(shownIn(first("clash"))).toBe(0);
    expect(shownIn(first("hit"))).toBe(0);
  });

  it("keeps the winning cut and its burst in the second take", () => {
    expect(shownIn(first("hit", 1))).toBe(1);
    expect(shownIn(first("finish"))).toBe(1);
  });

  it("opens the last take on the match won", () => {
    expect(shownIn(first("matchWon"))).toBe(2);
    expect(first("matchWon") - TAKES[2]!.duel).toBeLessThan(0.2);
  });

  it("runs the duel forward only", () => {
    let last = -Infinity;
    for (let t = 0; t < CYCLE_S; t += 0.05) {
      expect(duelAt(t)).toBeGreaterThan(last);
      last = duelAt(t);
    }
  });
});
