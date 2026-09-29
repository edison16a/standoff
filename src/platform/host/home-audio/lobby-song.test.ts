import { describe, expect, it } from "vitest";
import { BAR_STEPS, eventsAt, STEPS_PER_LOOP, type SongEvent } from "./lobby-song";

const all = (): SongEvent[][] => Array.from({ length: STEPS_PER_LOOP }, (_, step) => eventsAt(step));
/** F major: F G A Bb C D E. */
const IN_KEY = new Set([5, 7, 9, 10, 0, 2, 4]);

describe("the lobby song", () => {
  it("loops every eight bars", () => {
    expect(STEPS_PER_LOOP).toBe(8 * BAR_STEPS);
    expect(eventsAt(STEPS_PER_LOOP + 5)).toEqual(eventsAt(5));
  });

  it("stays in F major, so nothing ever sounds wrong", () => {
    const notes = all().flat().flatMap((event) => event.notes);
    expect(notes.length).toBeGreaterThan(100);
    for (const note of notes) expect(IN_KEY.has(note % 12)).toBe(true);
  });

  it("lands a kick, the bass and a chord on every downbeat", () => {
    for (let bar = 0; bar < STEPS_PER_LOOP / BAR_STEPS; bar++) {
      const voices = eventsAt(bar * BAR_STEPS).map((event) => event.voice);
      expect(voices).toEqual(expect.arrayContaining(["kick", "bass", "keys", "bell"]));
    }
  });

  it("never lets a melody note run past its bar", () => {
    all().forEach((events, step) => {
      for (const event of events.filter((each) => each.voice === "bell")) {
        expect((step % BAR_STEPS) + event.steps).toBeLessThanOrEqual(BAR_STEPS);
      }
    });
  });

  it("keeps the bass roots under the chords and the melody over the bass", () => {
    const events = all().flat();
    const notes = (voice: string, roots = false) =>
      events.filter((e) => e.voice === voice && (!roots || e.accent)).flatMap((e) => e.notes);
    expect(Math.max(...notes("bass", true))).toBeLessThan(Math.min(...notes("keys")));
    expect(Math.min(...notes("bell"))).toBeGreaterThan(Math.max(...notes("bass")));
  });
});
