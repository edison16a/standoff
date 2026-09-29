import { describe, expect, it } from "vitest";
import { adminSetPiece } from "../engine/admin";
import { createMatch, stepMatch, type Entrant } from "../engine/match";
import { STEP } from "../engine/tuning";
import { buildView } from "../engine/view";
import { ReplayRecorder } from "./replay";
import { aimLabel } from "./replay-facts";
import { locate } from "./replay-script";
import { SkipVotes } from "./replay-skip";

const LINEUP: Entrant[] = [
  { team: 0, character: "brandao", seat: null },
  { team: 0, character: "okemba", seat: null },
  { team: 1, character: "holmvik", seat: null },
  { team: 1, character: "lacerda", seat: null },
];

/** Plays computer players until a goal with every shot rigged to go in, recording as the host does. */
function recordedGoal(seed: number): ReplayRecorder {
  const state = createMatch(LINEUP, { seed, rig: () => "goal" });
  const recorder = new ReplayRecorder();
  for (let t = 0; t < 120 && state.phase !== "replay"; t += STEP) {
    stepMatch(state);
    if (state.events.some((e) => e.type === "goal")) recorder.markGoal(state.time);
    recorder.record(buildView(state));
  }
  expect(state.phase).toBe("replay");
  expect(recorder.cut()).toBe(true);
  return recorder;
}

describe("the goal replay", () => {
  it("runs the stages in order: the run, the strike in slow motion, the flight, then the net", () => {
    const script = recordedGoal(5).script!;
    const stages = script.segments.map((s) => s.stage);
    expect(stages[0]).toBe("run");
    expect(stages).toContain("strike");
    expect(stages.indexOf("strike")).toBeLessThan(stages.indexOf("flight"));
    const strike = script.segments.find((s) => s.stage === "strike")!;
    expect(strike.rate).toBeLessThan(0.3);
    expect(strike.camera).toBe("kicker");
    expect(script.segments.find((s) => s.stage === "flight")!.camera).toBe("keeper");
    // Slow motion makes it longer than the match seconds it shows.
    const shown = script.segments[script.segments.length - 1]!.to - script.segments[0]!.from;
    expect(script.length).toBeGreaterThan(shown);
  });

  it("reads plausible numbers off the strike", () => {
    const facts = recordedGoal(5).script!.facts!;
    expect(facts.ballMph).toBeGreaterThan(25);
    expect(facts.ballMph).toBeLessThan(90);
    expect(facts.runMph).toBeLessThan(25);
    expect(facts.spinRpm).toBeGreaterThan(50);
    expect(facts.aim).not.toBeNull();
  });

  it("maps replay time onto match time, slower in slow motion", () => {
    const recorder = recordedGoal(5);
    const script = recorder.script!;
    const strike = script.segments.find((s) => s.stage === "strike")!;
    const before = script.segments.slice(0, script.segments.indexOf(strike)).reduce((sum, s) => sum + (s.to - s.from) / s.rate, 0);
    const a = locate(script, before + 0.1)!;
    const b = locate(script, before + 0.3)!;
    expect(a.segment.stage).toBe("strike");
    expect(b.time - a.time).toBeCloseTo(0.2 * strike.rate, 5);
    expect(recorder.at(before + 0.1)?.segment.stage).toBe("strike");
  });
});

describe("a set piece goal's replay", () => {
  it("starts at the taker's run up, not at the lining up before it", () => {
    let checked = 0;
    for (let seed = 1; seed <= 12 && checked < 2; seed++) {
      const state = createMatch(LINEUP, { seed });
      const recorder = new ReplayRecorder();
      // Read through a function: the steps change the phase behind the type checker's back.
      const phase = (): string => state.phase;
      while (phase() !== "play") stepMatch(state);
      for (let t = 0; t < 3; t += STEP) stepMatch(state);
      adminSetPiece(state, "penalty");
      for (let t = 0; t < 30 && phase() !== "replay"; t += STEP) {
        stepMatch(state);
        if (state.events.some((e) => e.type === "goal")) recorder.markGoal(state.time);
        recorder.record(buildView(state));
      }
      if (phase() !== "replay" || !recorder.cut()) continue;
      checked++;
      const first = recorder.at(0)!.view;
      expect(first.phase === "play" || first.setPiece?.stage === "struck").toBe(true);
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe("the aim's name", () => {
  it("names the corner from the kicker's side", () => {
    expect(aimLabel({ x: 24, y: 2, z: 2.4 })).toBe("Top right corner");
    expect(aimLabel({ x: -24, y: 2, z: 2.4 })).toBe("Top left corner");
    expect(aimLabel({ x: 24, y: 0.3, z: -2.4 })).toBe("Bottom left corner");
    expect(aimLabel({ x: 24, y: 3.5, z: 0 })).toBe("Over the bar");
  });
});

describe("skipping the replay", () => {
  it("needs every player", () => {
    const votes = new SkipVotes();
    votes.start([1, 2, 3]);
    expect(votes.vote(1)).toBe(false);
    expect(votes.vote(1)).toBe(false);
    expect(votes.vote(2)).toBe(false);
    expect(votes.list()).toEqual([
      { seat: 1, agreed: true },
      { seat: 2, agreed: true },
      { seat: 3, agreed: false },
    ]);
    expect(votes.vote(3)).toBe(true);
  });

  it("ignores seats not in the match, and stops waiting for one that left", () => {
    const votes = new SkipVotes();
    votes.start([1, 2]);
    expect(votes.vote(5)).toBe(false);
    votes.vote(1);
    expect(votes.setPresent(2, false)).toBe(true);
  });

  it("cannot be skipped with nobody to vote", () => {
    const votes = new SkipVotes();
    votes.start([]);
    expect(votes.vote(1)).toBe(false);
  });
});
