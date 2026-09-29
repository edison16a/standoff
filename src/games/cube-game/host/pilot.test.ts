import { afterEach, describe, expect, it } from "vitest";
import { adminActions } from "@/platform/admin/admin-actions";
import { LevelBuilder } from "../engine/builder";
import { Pilot } from "./pilot";
import { Round, type SongSync } from "./round";
import { RoundAdmin } from "./round-admin";

const INFO = { id: "pilot", name: "Pilot", difficulty: 1, bpm: 120, theme: "test" } as const;

/** Twelve seconds long, with spikes to clear at four and at eight seconds. */
function level() {
  const b = new LevelBuilder(INFO, 10);
  b.jump(8).spikes(b.apex(8));
  b.jump(16).spikes(b.apex(16));
  return b.end(24).build();
}

class FakeSync implements SongSync {
  time = 0;
  songTime(): number {
    return this.time;
  }
  restart(levelTime: number, lead: number): void {
    this.time = levelTime - lead;
  }
}

function play(round: Round, sync: FakeSync, admin: RoundAdmin, until: number) {
  while (sync.time < until) {
    sync.time += 1 / 60;
    admin.tick();
    round.update();
  }
}

let admin: RoundAdmin | null = null;
afterEach(() => admin?.end());

describe("Pilot", () => {
  // Each call gives the clock now and where the avatar stood, a frame behind it.
  it("hands out each beat once, as the clock passes it", () => {
    const pilot = new Pilot(level());
    expect(pilot.due(3.9, 3.88)).toEqual([]);
    expect(pilot.due(4.01, 3.9)).toEqual([4]);
    expect(pilot.due(4.2, 4.01)).toEqual([]);
    expect(pilot.due(8.5, 4.2)).toEqual([8]);
  });

  it("starts again from the avatar after the clock goes back", () => {
    const pilot = new Pilot(level());
    pilot.due(4.5, 4.48);
    // A crash puts the avatar at the start, waiting for its beat.
    expect(pilot.due(-0.5, 0)).toEqual([]);
    expect(pilot.due(4.01, 3.99)).toEqual([4]);
  });

  it("skips beats before a practice checkpoint", () => {
    const pilot = new Pilot(level());
    pilot.due(9, 8.98);
    // Back from a checkpoint at six seconds, while the clock still reads five.
    expect(pilot.due(5, 6)).toEqual([]);
    expect(pilot.due(8.01, 7.99)).toEqual([8]);
  });

  it("presses nothing already behind the avatar when switched on mid run", () => {
    const pilot = new Pilot(level());
    expect(pilot.due(6, 5.98)).toEqual([]);
    expect(pilot.due(8.01, 6)).toEqual([8]);
  });
});

describe("autopilot in a race", () => {
  it("wins for the player on it while the other keeps crashing", () => {
    const sync = new FakeSync();
    const round = new Round(level(), 2, false, sync);
    admin = new RoundAdmin();
    admin.begin(round);
    expect(adminActions().map((a) => a.label)).toEqual(["Autopilot for player 1", "Autopilot for player 2"]);
    adminActions()[1]!.run();
    expect(adminActions()[1]!.label).toBe("Stop autopilot for player 2");
    play(round, sync, admin, 20);
    expect(round.winner).toBe(2);
    expect(round.run(1)!.attempt).toBeGreaterThan(1);
  });

  it("takes over after a crash and still finishes", () => {
    const sync = new FakeSync();
    const round = new Round(level(), 1, false, sync);
    admin = new RoundAdmin();
    admin.begin(round);
    play(round, sync, admin, 4.4);
    expect(round.status(1)).toBe("dead");
    admin.toggle(1);
    play(round, sync, admin, 30);
    expect(round.over).toBe(true);
    expect(round.run(1)!.attempt).toBe(2);
  });

  it("lists nothing once the round ends", () => {
    const round = new Round(level(), 1, false, new FakeSync());
    admin = new RoundAdmin();
    admin.begin(round);
    expect(adminActions().map((a) => a.label)).toEqual(["Autopilot"]);
    admin.end();
    expect(adminActions()).toEqual([]);
  });
});
