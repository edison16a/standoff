import { describe, expect, it } from "vitest";
import type { MatchPhase } from "@/shared/protocol";
import { DEFAULT_TUNING } from "@/shared/tuning";
import { Engine } from "./engine";
import type { GameEvent } from "./events";
import { TICK_MS } from "./fixed-step";
import { EN_GARDE_SECONDS, HALT_MS } from "./rules";

function setup() {
  const events: GameEvent[] = [];
  const phases: MatchPhase[] = [];
  const engine = new Engine({ 1: "vale", 2: "marrow" }, () => DEFAULT_TUNING, {
    onEvent: (event) => events.push(event),
    onPhase: (phase) => phases.push(phase),
  });
  const runFor = (ms: number) => {
    for (let t = 0; t < ms; t += TICK_MS) engine.tick();
  };
  return { engine, events, phases, runFor };
}

describe("Engine", () => {
  it("plays a full exchange: advance, touch, halt, next en garde", () => {
    const { engine, events, phases, runFor } = setup();
    engine.start();
    runFor(EN_GARDE_SECONDS * 1000 + 50);
    expect(engine.phase).toBe("live");

    // Close from 4 m to about 2.2 m, inside reach.
    engine.control(1, { pitch: 0, yaw: 0, roll: 0, move: 1 });
    runFor(1000);
    engine.control(1, { pitch: 0, yaw: 0, roll: 0, move: 0 });
    engine.strike(1, "jab");
    runFor(400);

    expect(events.map((e) => e.type)).toEqual(expect.arrayContaining(["allez", "jab", "touch"]));
    expect(engine.match.scores[1]).toBe(1);
    expect(engine.phase).toBe("halt");
    runFor(HALT_MS + 50);
    expect(phases.slice(-1)[0]).toBe("enGarde");
    expect(engine.fencers[1].x).toBeCloseTo(engine.fencers[1].startX);
  });

  it("separates the fencers after corps-à-corps", () => {
    const { engine, events, runFor } = setup();
    engine.start();
    runFor(EN_GARDE_SECONDS * 1000 + 50);
    engine.control(1, { pitch: 0, yaw: 0, roll: 0, move: 1 });
    engine.control(2, { pitch: 0, yaw: 0, roll: 0, move: 1 });
    runFor(2000);
    expect(events.some((e) => e.type === "corps")).toBe(true);
    runFor(1000);
    expect(engine.phase).toBe("enGarde");
    expect(engine.fencers[2].x - engine.fencers[1].x).toBeGreaterThan(3);
  });

  it("pauses when a phone drops and ignores strikes while paused", () => {
    const { engine, events, runFor } = setup();
    engine.start();
    runFor(EN_GARDE_SECONDS * 1000 + 50);
    engine.setConnected({ 1: true, 2: false });
    expect(engine.phase).toBe("paused");
    engine.strike(1, "jab");
    expect(events.some((e) => e.type === "jab")).toBe(false);
    engine.setConnected({ 1: true, 2: true });
    expect(engine.phase).toBe("enGarde");
  });
});
