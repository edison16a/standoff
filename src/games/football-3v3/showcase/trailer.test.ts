import { describe, expect, it } from "vitest";
import { Match, STEP, type MatchEvent } from "../engine";
import { CEREMONY } from "../engine/ceremony";
import { SHOWCASE_TEAMS } from "./scene";
import { FILM_LENGTH, SHOTS, filmAt, shotLength } from "./trailer";
import { STILLS } from "./stills";

/** Plays the showcase game to `until`, noting when each event happened. */
function play(until: number): { at: number; e: MatchEvent }[] {
  const match = new Match({ entries: SHOWCASE_TEAMS, seed: 11, level: "hard", firstOffense: 0 });
  const log: { at: number; e: MatchEvent }[] = [];
  while (match.time < until - 1e-9) {
    match.step(STEP);
    for (const e of match.drainEvents()) log.push({ at: match.time, e });
  }
  return log;
}

const shot = (camera: string) => SHOTS.find((s) => s.camera === camera)!;
const inside = (at: number, camera: string) => at > shot(camera).from && at < shot(camera).to;

// The media were filmed from this exact game. An engine or bot change that moves it
// fails here, as a reminder to pick new moments and film the media again.
describe("football trailer", () => {
  const log = play(70);

  it("lasts exactly the eight seconds the capture films, so the loop has no seam", () => {
    expect(FILM_LENGTH).toBeCloseTo(8, 6);
    expect(filmAt(0).index).toBe(0);
    expect(filmAt(FILM_LENGTH + 0.01).index).toBe(0);
    expect(filmAt(FILM_LENGTH - 0.01).index).toBe(SHOTS.length - 1);
  });

  it("keeps every shot short, like a trailer's fast cuts", () => {
    for (const s of SHOTS) expect(shotLength(s)).toBeLessThan(2.5);
  });

  it("lands the throw, the catch and the big hit inside their shots", () => {
    const throwAt = log.find((l) => l.e.type === "throw")!.at;
    const catchAt = log.find((l) => l.e.type === "catch")!.at;
    const hit = log.find((l) => l.e.type === "tackle" && l.at > 60)!;
    expect(inside(throwAt, "qbLow") || Math.abs(throwAt - shot("qbLow").to) < 0.2).toBe(true);
    expect(inside(catchAt, "catch")).toBe(true);
    expect(inside(hit.at, "hit")).toBe(true);
    expect(hit.e).toMatchObject({ id: 2, by: 8 });
  });

  it("shows the side step as the Storm's runner carries it the distance", () => {
    const jukes = log.filter((l) => l.e.type === "juke" && l.e.id === 1).map((l) => l.at);
    expect(jukes.some((at) => inside(at, "juke"))).toBe(true);
    expect(log.find((l) => l.e.type === "touchdown")?.e).toMatchObject({ id: 1, pass: 0 });
  });

  it("ends on the trophy going up", () => {
    const lift = shot("lift");
    // The trophy reel starts at the final whistle, so its presentation clock is match time less the cut.
    expect(lift.from - CEREMONY.cut).toBeLessThan(CEREMONY.raise);
    expect(lift.to - CEREMONY.cut).toBeGreaterThan(CEREMONY.raise + 0.5);
  });

  it("holds the stills inside the film", () => {
    for (const still of Object.values(STILLS)) expect(still!.t).toBeLessThan(FILM_LENGTH);
  });
});
