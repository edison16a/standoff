import { describe, expect, it } from "vitest";
import type { HostPad } from "@/games/kit/pad/host-pad";
import type { MatchEvent } from "../engine/events";
import { heldFor } from "../engine/charge";
import { MATCH, STEP } from "../engine/tuning";
import { BUTTONS } from "../protocol";
import { MatchDriver } from "./match-driver";

/** A pad with the stick at rest: the presses under test are fed in by hand. */
const PAD = { stick: () => ({ x: 0, y: 0 }) } as unknown as HostPad;

function driver(): { d: MatchDriver; run: (seconds: number) => MatchEvent[] } {
  const d = new MatchDriver(
    [
      { team: 0, character: "echeverri", seat: 1 },
      { team: 1, character: "holmvik", seat: null },
    ],
    3,
  );
  let now = 0;
  const run = (seconds: number) => {
    const events: MatchEvent[] = [];
    for (let t = 0; t < seconds; t += STEP) {
      now += STEP * 1000;
      events.push(...d.tick(now, PAD));
    }
    return events;
  };
  run(MATCH.kickoffWait + 0.1);
  const me = d.state.athletes[0]!;
  d.state.athletes[1]!.pos = { x: -18, z: 10 };
  me.pos = { x: 8, z: 0 };
  d.state.ball.owner = { kind: "athlete", id: 0 };
  return { d, run };
}

describe("the match driver", () => {
  it("judges a Shoot/Pass release by the phone's own measure of the hold", () => {
    const { d, run } = driver();
    d.press(1, BUTTONS.shoot, true, 1, 0);
    run(STEP * 2);
    // Only a moment passed on the host, but the phone saw the bar well into the yellow.
    d.noteHeld(1, heldFor(0.65));
    d.press(1, BUTTONS.shoot, false, 1, 0);
    const shot = run(0.6).find((e) => e.type === "shot");
    expect(shot?.type === "shot" && shot.power).toBeCloseTo(0.65, 1);
  });

  it("passes on a quick press and release", () => {
    const { d, run } = driver();
    d.press(1, BUTTONS.shoot, true, 0, 0);
    d.press(1, BUTTONS.shoot, false, 0, 0);
    const events = run(0.5);
    expect(events.some((e) => e.type === "pass")).toBe(true);
    expect(events.some((e) => e.type === "shot")).toBe(false);
  });

  it("turns the second button into a skill move with the ball", () => {
    const { d, run } = driver();
    d.press(1, BUTTONS.slide, true, 0, -1);
    d.press(1, BUTTONS.slide, false, 0, -1);
    const events = run(0.2);
    expect(events.some((e) => e.type === "skill")).toBe(true);
    expect(events.some((e) => e.type === "slide")).toBe(false);
  });
});
