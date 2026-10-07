import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../engine/events";
import { STEP } from "../engine/tuning";
import type { Film } from "./dev";
import { PosterFilm } from "./film-poster";
import { StepbackFilm } from "./film-stepback";
import { CAST } from "./trailer-cast";

/** Plays a film for `seconds` as the trailer steps it and returns every event with its time. */
function play(film: Film, seconds: number, each?: (events: MatchEvent[]) => void): { t: number; e: MatchEvent }[] {
  const out: { t: number; e: MatchEvent }[] = [];
  for (let t = 0; t < seconds; t += STEP) {
    film.steer(t);
    film.match.step(STEP);
    const events = film.match.drainEvents();
    for (const e of events) out.push({ t, e });
    each?.(events);
  }
  return out;
}

const at = (log: { t: number; e: MatchEvent }[], pick: (e: MatchEvent) => boolean) => log.find((x) => pick(x.e))?.t ?? NaN;

describe("the poster film", () => {
  it("lobs over the Big Man as he rises, and the Dunker posters him to the floor with two hands", () => {
    const film = new PosterFilm();
    let bigUp = 0;
    const log = play(film, 3.6, (events) => {
      if (events.some((e) => e.type === "pass")) bigUp = film.match.athletes[CAST.big]!.y;
    });
    const lob = log.find((x) => x.e.type === "pass")?.e;
    expect(lob).toMatchObject({ type: "pass", from: CAST.playmaker, to: CAST.dunker, lob: true });
    // The Big Man is already off the floor for the layup when the lob goes up.
    expect(bigUp).toBeGreaterThan(0.05);
    expect(at(log, (e) => e.type === "knockdown")).toBeGreaterThan(at(log, (e) => e.type === "catch"));
    const dunk = log.find((x) => x.e.type === "dunk")?.e;
    expect(dunk).toMatchObject({ type: "dunk", id: CAST.dunker, style: "poster" });
    expect(log.find((x) => x.e.type === "knockdown")?.e).toMatchObject({ id: CAST.big, by: CAST.dunker });
    expect(log.some((x) => x.e.type === "score" && x.e.points === 2)).toBe(true);
    expect(log.some((x) => x.e.type === "steal" || x.e.type === "intercept" || x.e.type === "foul")).toBe(false);
  });
});

describe("the stepback film", () => {
  it("hits a stepback, rises over two leaping defenders and swishes a gold three", () => {
    const film = new StepbackFilm();
    const m = film.match;
    let upAtRelease = 0;
    const log = play(film, 3.2, (events) => {
      if (events.some((e) => e.type === "shot")) upAtRelease = [CAST.lockdown, CAST.allround].filter((id) => m.athletes[id]!.y > 0.2).length;
    });
    expect(log.find((x) => x.e.type === "move")?.e).toMatchObject({ move: "stepback", id: CAST.shooter });
    // Nobody is shaken off his feet by the stepback: both are up to contest.
    expect(log.some((x) => x.e.type === "shake")).toBe(false);
    expect(upAtRelease).toBe(2);
    expect(log.find((x) => x.e.type === "shot")?.e).toMatchObject({ grade: "gold", three: true, outcome: "swish" });
    expect(log.some((x) => x.e.type === "net" && x.e.swish)).toBe(true);
  });
});
