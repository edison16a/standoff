import { describe, expect, it } from "vitest";
import { Engine } from "@/games/blade-clash/engine/engine";
import type { GameEvent } from "@/games/blade-clash/engine/events";
import { DEFAULT_TUNING } from "@/games/blade-clash/tuning";
import { Choreography, OPENING_SCORE } from "./choreography";

/** Plays the showcase duel through the real engine and lists what happened, in milliseconds from the fight's start. */
function play(untilMs: number): { t: number; event: GameEvent }[] {
  const events: GameEvent[] = [];
  const engine = new Engine({ 1: "knight", 2: "star" }, () => DEFAULT_TUNING, { onEvent: (e) => events.push(e), onPhase: () => undefined });
  engine.start();
  engine.match.score = { ...OPENING_SCORE };
  const choreography = new Choreography();
  let now = 0;
  let fightAt: number | null = null;
  while (fightAt === null || now - fightAt < untilMs) {
    now += 1000 / 60;
    choreography.drive(engine, fightAt === null ? 0 : now - fightAt);
    engine.advance(now);
    if (fightAt === null && events.some((e) => e.type === "fight")) fightAt = engine.now;
  }
  const kept = new Set<GameEvent["type"]>(["clash", "hit", "reset"]);
  return events.filter((e) => kept.has(e.type)).map((event) => ({ t: event.t - fightAt!, event }));
}

describe("the showcase duel", () => {
  const happened = play(8000);
  const at = (t: number) => happened.find((h) => Math.abs(h.t - t) < 400);
  const hits = happened.filter((h) => h.event.type === "hit");

  it("opens with a big clash", () => {
    expect(at(1300)?.event.type).toBe("clash");
  });

  it("levels the score with the Knight's cut, then puts both back on their marks", () => {
    expect(hits[0]?.event).toMatchObject({ type: "hit", attacker: 1, score: OPENING_SCORE[1] + 1, final: false });
    expect(hits[0]!.t).toBeLessThan(3000);
    expect(happened.some((h) => h.event.type === "reset" && h.t > hits[0]!.t)).toBe(true);
  });

  it("ends on the Knight's winning cut", () => {
    expect(hits).toHaveLength(2);
    expect(hits[1]!.event).toMatchObject({ type: "hit", attacker: 1, final: true });
    expect(hits[1]!.t).toBeGreaterThan(5000);
    expect(hits[1]!.t).toBeLessThan(6200);
  });
});
