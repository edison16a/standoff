import { describe, expect, it } from "vitest";
import { Engine } from "@/games/blade-clash/engine/engine";
import type { GameEvent } from "@/games/blade-clash/engine/events";
import { DEFAULT_TUNING } from "@/games/blade-clash/tuning";
import { Choreography, OPENING_HEALTH } from "./choreography";

/** Plays the showcase duel through the real engine and lists what happened, in milliseconds from the fight's start. */
function play(untilMs: number): { t: number; event: GameEvent }[] {
  const events: GameEvent[] = [];
  const engine = new Engine({ 1: "knight", 2: "star" }, () => DEFAULT_TUNING, { onEvent: (e) => events.push(e), onPhase: () => undefined });
  engine.start();
  engine.match.health = { ...OPENING_HEALTH };
  for (const slot of [1, 2] as const) engine.fighters[slot].health = OPENING_HEALTH[slot];
  const choreography = new Choreography();
  let now = 0;
  let fightAt: number | null = null;
  while (fightAt === null || now - fightAt < untilMs) {
    now += 1000 / 60;
    choreography.drive(engine, fightAt === null ? 0 : now - fightAt);
    engine.advance(now);
    if (fightAt === null && events.some((e) => e.type === "fight")) fightAt = engine.now;
  }
  return events.filter((e) => e.type === "clash" || e.type === "hit").map((event) => ({ t: event.t - fightAt!, event }));
}

describe("the showcase duel", () => {
  const happened = play(8000);
  const at = (t: number) => happened.find((h) => Math.abs(h.t - t) < 500);

  it("opens with a clash each way", () => {
    expect(at(1300)?.event.type).toBe("clash");
    expect(at(2350)?.event.type).toBe("clash");
  });

  it("lands a hit each way", () => {
    expect(at(3450)?.event).toMatchObject({ type: "hit", attacker: 1 });
    expect(at(4450)?.event).toMatchObject({ type: "hit", attacker: 2 });
  });

  it("ends on the Knight's final hit", () => {
    const last = happened.filter((h) => h.event.type === "hit").at(-1)!;
    expect(last.event).toMatchObject({ type: "hit", attacker: 1, final: true });
    expect(last.t).toBeGreaterThan(6000);
  });
});
