import { describe, expect, it } from "vitest";
import { CHARACTER_IDS, type CharacterId } from "../roster";
import type { Difficulty } from "./bots/brain";
import type { MatchEvent } from "./events";
import { createMatch, setBot, stepMatch, type Entrant } from "./match";
import { STAGE_IDS, type StageId } from "./stages";
import { RULES } from "./tuning";
import type { MatchState } from "./types";

const FOUR: Entrant[] = CHARACTER_IDS.map((character) => ({ character, seat: null }));

/** Plays a match of bots to the results, or gives up after five minutes. */
function playOut(entrants: Entrant[], seed: number, stage: StageId, difficulty: Difficulty = "normal"): { state: MatchState; events: MatchEvent[] } {
  const state = createMatch(entrants, { seed, stage, difficulty });
  const events: MatchEvent[] = [];
  while (state.phase !== "over" && state.frame < 60 * 300) {
    stepMatch(state);
    events.push(...state.events);
    for (const f of state.fighters) if (!Number.isFinite(f.pos.x + f.pos.y)) throw new Error("A fighter left the world.");
  }
  return { state, events };
}

describe("a match", () => {
  it("counts down Ready then Fight before anyone moves", () => {
    const state = createMatch(FOUR);
    const calls: string[] = [];
    for (let i = 0; i < RULES.countdown + 2; i++) {
      stepMatch(state);
      for (const e of state.events) if (e.type === "countdown") calls.push(e.call);
      if (i < RULES.countdown - 1) expect(state.phase).toBe("ready");
    }
    expect(calls).toEqual(["ready", "fight"]);
    expect(state.phase).toBe("fight");
  });

  it("starts fighters spread across the main platform, facing the middle", () => {
    const two = createMatch([FOUR[0]!, FOUR[1]!]);
    expect(two.fighters[0]!.pos.x).toBeLessThan(-4);
    expect(two.fighters[1]!.pos.x).toBeGreaterThan(4);
    expect(two.fighters[0]!.facing).toBe(1);
    expect(two.fighters[1]!.facing).toBe(-1);
    const four = createMatch([...FOUR, ...FOUR]);
    expect(four.fighters).toHaveLength(4);
    expect(new Set(four.fighters.map((f) => f.pos.x)).size).toBe(4);
    for (const f of four.fighters) expect(f.stocks).toBe(RULES.stocks);
  });

  it("gives bots a brain and phones none, and can swap them", () => {
    const state = createMatch([{ character: "mage", seat: 1 }, FOUR[3]!], { difficulty: "hard" });
    expect(state.fighters[0]!.brain).toBeNull();
    expect(state.fighters[1]!.brain?.difficulty).toBe("hard");
    setBot(state, 0, true);
    expect(state.fighters[0]!.brain).not.toBeNull();
    setBot(state, 0, false);
    expect(state.fighters[0]!.brain).toBeNull();
  });
});

describe("four bots", () => {
  const matches = STAGE_IDS.map((stage, i) => playOut(FOUR, i + 1, stage));

  it("fight to a winner on every stage in a sensible time", () => {
    for (const { state } of matches) {
      expect(state.phase).toBe("over");
      expect(state.winner).not.toBeNull();
      const seconds = state.frame / 60;
      expect(seconds).toBeGreaterThan(20);
      expect(seconds).toBeLessThan(240);
      // Fighters out on the same step share a place, so each place counts who finished ahead.
      const places = state.fighters.map((f) => f.place!);
      for (const p of places) expect(p).toBe(1 + places.filter((q) => q < p).length);
      expect(state.fighters[state.winner!]!.place).toBe(1);
    }
  });

  it("land hits, knock each other out, and mostly earn their KOs", () => {
    const all = matches.flatMap((m) => m.events);
    const kos = all.filter((e) => e.type === "ko");
    expect(kos.length).toBe(matches.length * 7);
    expect(kos.filter((e) => e.type === "ko" && e.by === null).length).toBeLessThan(kos.length / 4);
    expect(all.filter((e) => e.type === "hit").length).toBeGreaterThan(matches.length * 30);
  });

  it("use light moves, heavy moves, aerials and ults", () => {
    const moves = new Set(matches.flatMap((m) => m.events.flatMap((e) => (e.type === "swing" ? [e.move] : []))));
    for (const key of ["side", "up", "heavy", "heavySide", "heavyDown", "air", "airUp", "airDown", "ult"]) expect(moves).toContain(key);
  });

  it("play the same match from the same seed", () => {
    const again = playOut(FOUR, 1, STAGE_IDS[0]);
    expect(again.state.frame).toBe(matches[0]!.state.frame);
    expect(again.state.winner).toBe(matches[0]!.state.winner);
    expect(again.state.fighters.map((f) => f.stats)).toEqual(matches[0]!.state.fighters.map((f) => f.stats));
  });
});

describe("bot difficulty", () => {
  it("lets a hard bot beat an easy one most of the time", () => {
    let hardWins = 0;
    let games = 0;
    const pairs: [CharacterId, CharacterId][] = [["karate", "karate"], ["samurai", "samurai"], ["bear", "mage"], ["mage", "bear"]];
    for (const [i, [hardChar, easyChar]] of pairs.entries()) {
      const state = createMatch([{ character: hardChar, seat: null }, { character: easyChar, seat: null }], { seed: 40 + i, stage: STAGE_IDS[i % 4] });
      state.fighters[0]!.brain!.difficulty = "hard";
      state.fighters[1]!.brain!.difficulty = "easy";
      while (state.phase !== "over" && state.frame < 60 * 300) stepMatch(state);
      games++;
      if (state.winner === 0) hardWins++;
    }
    expect(hardWins).toBeGreaterThanOrEqual(games - 1);
  });
});
