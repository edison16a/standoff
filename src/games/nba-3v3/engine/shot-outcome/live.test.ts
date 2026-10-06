import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../../builds";
import type { MatchEvent } from "../events";
import { Match, type Entry } from "../match";
import { GREEN_MS } from "../shot-model";
import { STEP } from "../tuning";
import { PRESETS, isMakePreset, type ShotPreset } from "./presets";

const ENTRIES: Entry[] = BUILD_IDS.slice(0, 6).map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: i === 0 ? 1 : null }));

/** A jumper from the wing with nobody near, its ending set ahead, flown in a real game until it is decided. */
function shoot(preset: ShotPreset): { events: MatchEvent[]; match: Match } {
  const m = new Match({ entries: ENTRIES, seed: 5, firstOffence: 0 });
  while (m.phase !== "live") m.step(STEP);
  const a = m.athletes[0]!;
  Object.assign(a, { x: 2.6, z: 5.4, vx: 0, vz: 0, yaw: Math.PI, action: { kind: "none" } });
  m.ball.holder = 0;
  m.ball.mode = "held";
  m.needsClear = false;
  for (const o of m.athletes) if (o !== a) Object.assign(o, { x: o.x + 20, auto: false });
  m.forced = preset;
  m.press(0, "shoot");
  for (let t = 0; t < GREEN_MS / 1000 - STEP; t += STEP) m.step(STEP);
  m.release(0, GREEN_MS);
  const events: MatchEvent[] = [];
  const decided = () => m.ball.shot !== null && m.ball.mode !== "flight";
  for (let t = 0; t < 5 && !decided(); t += STEP) {
    m.step(STEP);
    events.push(...m.drainEvents());
  }
  return { events, match: m };
}

describe("a picked ending in a live game", () => {
  it("flies every preset to the make or miss it promised, the same as the look ahead", () => {
    for (const preset of PRESETS) {
      const { events, match } = shoot(preset);
      const shot = events.find((e) => e.type === "shot");
      expect(shot?.type === "shot" && shot.preset, preset).toBe(preset);
      expect(match.ball.shot!.made, preset).toBe(isMakePreset(preset));
      // The live ball names it exactly as the look ahead did.
      expect(shot?.type === "shot" && shot.outcome, preset).toBe(match.ball.shot!.outcome);
      expect(events.some((e) => e.type === "net"), preset).toBe(isMakePreset(preset));
    }
  });

  it("swishes clean through the net, and rolls round the iron before it drops", () => {
    const swish = shoot("swish").events.find((e) => e.type === "net");
    expect(swish?.type === "net" && swish.swish).toBe(true);
    const roll = shoot("rollIn");
    expect(roll.match.ball.shot!.flight.rode).toBe(true);
    expect(roll.events.filter((e) => e.type === "rim").length).toBeGreaterThan(2);
  });
});
