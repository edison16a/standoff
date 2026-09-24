import { describe, expect, it } from "vitest";
import type { RaceEvent } from "./events";
import { createKart } from "./kart";
import { checkpointSpacing, currentLap, rank, updateProgress, updateStuck, updateWrongWay } from "./race";
import { Track } from "./track";
import { OVAL } from "./test-track";
import { RACE } from "./tuning";

const track = new Track(OVAL);

/** Teleports a kart along the lap in small steps, as if it drove there. */
function driveTo(kart: ReturnType<typeof createKart>, to: number, events: RaceEvent[], time = 10): void {
  const from = kart.race.progress;
  for (let p = from; p <= to; p += 2) {
    const s = track.wrap(p);
    const pos = track.pointAt(s, 0);
    kart.x = pos.x;
    kart.z = pos.z;
    kart.loc = track.locate(pos.x, pos.z, kart.loc.index);
    updateProgress(kart, track, time, 0, (e) => events.push(e));
  }
}

describe("lap counting", () => {
  it("counts a lap only after every checkpoint, and finishes after the last lap", () => {
    const kart = createKart(0, "blaze", 1, track, track.wrap(-8), 0);
    const events: RaceEvent[] = [];
    expect(kart.race.progress).toBeCloseTo(-8, 0);
    driveTo(kart, track.length + 5, events);
    expect(events.filter((e) => e.type === "lap")).toEqual([{ type: "lap", kart: 0, lap: 2 }]);
    expect(events.some((e) => e.type === "finalLap")).toBe(true);
    expect(currentLap(kart)).toBe(2);
    driveTo(kart, track.length * RACE.laps + 5, events);
    expect(kart.race.finished).toBe(true);
    expect(events.at(-1)).toEqual({ type: "finish", kart: 0, place: 1 });
  });

  it("gives nothing for cutting across to a later part of the lap", () => {
    const kart = createKart(0, "pip", 1, track, 2, 0);
    const events: RaceEvent[] = [];
    driveTo(kart, 20, events);
    // Jump straight to the far side of the lap, skipping checkpoints.
    const far = track.pointAt(track.length * 0.6, 0);
    kart.x = far.x;
    kart.z = far.z;
    kart.loc = track.locate(far.x, far.z, -1);
    const status = updateProgress(kart, track, 5, 0, (e) => events.push(e));
    expect(status).toBe("lost");
    expect(kart.race.checkpoints).toBe(0);
    expect(kart.race.progress).toBeLessThanOrEqual(checkpointSpacing(track));
  });
});

describe("standings", () => {
  it("puts finishers first in finishing order, then the rest by distance", () => {
    const a = createKart(0, "blaze", 1, track, 10, 0);
    const b = createKart(1, "pip", 2, track, 10, 0);
    const c = createKart(2, "nova", null, track, 10, 0);
    a.race.progress = 50;
    b.race.progress = 80;
    c.race.finished = true;
    c.race.finishTime = 70;
    expect(rank([a, b, c]).map((k) => k.id)).toEqual([2, 1, 0]);
    expect(a.race.place).toBe(3);
  });
});

describe("wrong way", () => {
  it("warns after a moment facing back down the road at speed", () => {
    const kart = createKart(0, "mochi", 1, track, 30, 0);
    kart.heading += Math.PI;
    kart.vx = Math.sin(kart.heading) * 10;
    kart.vz = Math.cos(kart.heading) * 10;
    updateWrongWay(kart, track, 0.5);
    expect(kart.race.wrongWay).toBe(false);
    for (let i = 0; i < 10; i++) updateWrongWay(kart, track, 0.2);
    expect(kart.race.wrongWay).toBe(true);
  });
});

describe("stuck karts", () => {
  it("are put back after a while of pressing on without getting anywhere, even while bouncing about", () => {
    const kart = createKart(0, "pip", 1, track, 40, 0);
    kart.vx = 6;
    let stuck = false;
    for (let t = 0; t < 4; t += 0.1) stuck = updateStuck(kart, true, 0.1);
    expect(stuck).toBe(false);
    for (let t = 0; t < 2; t += 0.1) stuck = updateStuck(kart, true, 0.1);
    expect(stuck).toBe(true);
  });

  it("are left alone while getting on, or while not trying", () => {
    const kart = createKart(0, "pip", 1, track, 40, 0);
    for (let t = 0; t < 10; t += 0.1) {
      kart.race.progress += 1;
      expect(updateStuck(kart, true, 0.1)).toBe(false);
    }
    for (let t = 0; t < 10; t += 0.1) expect(updateStuck(kart, false, 0.1)).toBe(false);
  });
});
