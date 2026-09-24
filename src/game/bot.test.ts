import { describe, expect, it } from "vitest";
import { DEFAULT_TUNING } from "@/shared/tuning";
import { Bot } from "./bot";
import { Engine } from "./engine";
import type { GameEvent } from "./events";
import { TICK_MS } from "./fixed-step";

function setup(random: () => number) {
  const events: GameEvent[] = [];
  const engine = new Engine({ 1: "vale", 2: "iron" }, () => DEFAULT_TUNING, {
    onEvent: (event) => events.push(event),
    onPhase: () => undefined,
  });
  const bot = new Bot(2, random);
  /** Runs the engine with the bot at the controls, stopping early if `until` says so. */
  const runFor = (ms: number, until: () => boolean = () => false) => {
    for (let t = 0; t < ms && !until(); t += TICK_MS) {
      bot.drive(engine);
      engine.tick();
    }
  };
  engine.start();
  runFor(3100);
  return { engine, events, runFor };
}

describe("Bot", () => {
  it("closes in and scores on a player who stands still", () => {
    const { engine, runFor } = setup(() => 0.5);
    expect(engine.phase).toBe("live");
    runFor(8000, () => engine.match.scores[2] > 0);
    expect(engine.match.scores[2]).toBe(1);
  });

  it("parries a jab when it reacts in time", () => {
    // The first draw puts its own attack far off. Every later one parries, fast.
    let draws = 0;
    const { engine, events, runFor } = setup(() => (draws++ === 0 ? 1 : 0));
    engine.control(1, { pitch: 0, yaw: 0, roll: 0, move: 1 });
    runFor(3000, () => engine.fencers[2].x - engine.fencers[1].x <= 2.1);
    engine.control(1, { pitch: 0, yaw: 0, roll: 0, move: 0 });
    engine.strike(1, "jab");
    runFor(300);
    expect(events).toContainEqual(expect.objectContaining({ type: "parried", attacker: 1 }));
  });
});
