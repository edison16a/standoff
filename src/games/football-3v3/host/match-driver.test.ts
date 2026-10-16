import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../engine/events";
import { BOTS, PEOPLE } from "../engine/test-helpers";
import { RULES } from "../engine/tuning";
import { MatchDriver, type Sticks } from "./match-driver";
import { ReplayDirector } from "./replay/director";
import { findMoments } from "./replay/moments";
import { scriptReplay } from "./replay/script";
import { CameraDirector } from "../render/camera/director";

const still: Sticks = { move: () => ({ x: 0, y: 0 }), forward: { x: 1, z: 0 } };

/** Ticks the driver at 60 frames a second until `until` holds or `seconds` run out. */
function play(driver: MatchDriver, seconds: number, until: (events: MatchEvent[]) => boolean, from = 0): number {
  let now = from;
  for (let frame = 0; frame < seconds * 60; frame++) {
    now += 1000 / 60;
    if (until(driver.tick(now, still))) break;
  }
  return now;
}

describe("the host's match driver", () => {
  it("steps the match from the animation clock", () => {
    const driver = new MatchDriver(BOTS, 3, "hard");
    play(driver, 5, () => false);
    expect(driver.match.time).toBeGreaterThan(4.5);
    expect(driver.match.time).toBeLessThan(5.1);
  });

  it("holds after a touchdown's celebration until told to go on to the try", () => {
    const driver = new MatchDriver(PEOPLE, 3, "easy");
    play(driver, 1, () => false);
    driver.admin("touchdown");
    let now = play(driver, RULES.touchdownSeconds + 2, () => driver.held, 1000);
    expect(driver.held).toBe(true);
    expect(driver.match.phase).toBe("touchdown");
    const time = driver.match.time;
    now = play(driver, 1, () => false, now);
    expect(driver.match.time).toBe(time);
    driver.resume();
    play(driver, 1, () => false, now);
    expect(driver.match.phase).toBe("convert");
  });

  it("turns a phone's stick into a run up the screen", () => {
    const driver = new MatchDriver(PEOPLE, 3, "easy");
    const qb = driver.match.bySeat(0)!;
    driver.press(0, "juke", true, { x: 0, y: 1 }, { x: 0, z: -1 });
    expect(qb.move.x).toBeCloseTo(0, 6);
    expect(qb.move.z).toBeCloseTo(-1, 6);
  });

  it("records a computer passing touchdown that the replay can cut up", () => {
    const driver = new MatchDriver(BOTS, 5, "hard");
    let scored: number | null = null;
    let passed = false;
    play(driver, 900, (events) => {
      for (const e of events) if (e.type === "touchdown" && !e.conversion && e.pass !== null) passed = true;
      if (driver.held && passed) scored = driver.replayFor;
      else if (driver.held) driver.resume();
      return scored !== null;
    });
    expect(scored).not.toBeNull();
    const clip = driver.recorder.all;
    const script = scriptReplay(clip, scored!)!;
    // One shot that follows the throw: from the QB set, the ball to the catch, then the run in. At full speed.
    expect(script.segments).toHaveLength(1);
    const shot = script.segments[0]!;
    expect(shot.angle).toBe("trace");
    const moments = findMoments(clip, scored!)!;
    expect(shot.from).toBeLessThan(moments.pass!.throwAt);
    expect(shot.to).toBeGreaterThan(moments.tdAt);
    expect(script.length).toBeCloseTo(shot.to - shot.from, 6);
    // The play's sounds come with it, and none of the live moment's.
    const heard = new Set(driver.recorder.cues.map((c) => c.event.type));
    expect(heard.has("throw")).toBe(true);
    expect(heard.has("catch")).toBe(true);
    expect(heard.has("whistle")).toBe(false);
    expect(heard.has("touchdown")).toBe(false);
    // Played through, it hears the throw and the catch once each, and none of the pads or hits.
    const replay = new ReplayDirector();
    expect(replay.start(clip, scored!, [], 0, driver.recorder.cues)).toBe(true);
    const sounds: string[] = [];
    let ms = 0;
    while (!replay.update(ms)) {
      for (const e of replay.sounds()) sounds.push(e.type);
      ms += 1000 / 60;
    }
    expect(sounds.filter((t) => t === "throw")).toHaveLength(1);
    expect(sounds.filter((t) => t === "catch")).toHaveLength(1);
    expect(sounds.some((t) => t === "pads" || t === "tackle" || t === "missedTackle")).toBe(false);
    expect(ms / 1000).toBeCloseTo(script.length + 0.4, 1);
    // One camera all the way: it cuts in once and glides from the QB to the ball to the run, never cutting again.
    replay.start(clip, scored!, [], 0, driver.recorder.cues);
    const camera = new CameraDirector();
    let cuts = 0;
    for (ms = 0; !replay.update(ms); ms += 1000 / 60) {
      const frame = replay.frame()!;
      camera.setReplay({ angle: frame.segment.angle, passer: script.passer, scorer: script.scorer });
      if (camera.update(frame.view, 1 / 60, ms / 1000)) cuts++;
    }
    expect(cuts).toBe(1);
  });
});
