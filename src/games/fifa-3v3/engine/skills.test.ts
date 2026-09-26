import { describe, expect, it } from "vitest";
import type { MatchEvent } from "./events";
import { createMatch, stepMatch, type Entrant } from "./match";
import { ballOffset, MOVES, type MoveFrame } from "./skill-moves";
import { pickSkill, skillRisk } from "./skills";
import { MATCH, STEP } from "./tuning";
import type { MatchState, SkillKind } from "./types";

const LINEUP: Entrant[] = [
  { team: 0, character: "echeverri", seat: 1 },
  { team: 0, character: "brandao", seat: null },
  { team: 0, character: "okemba", seat: null },
  { team: 1, character: "holmvik", seat: 2 },
  { team: 1, character: "lacerda", seat: null },
  { team: 1, character: "ashworth", seat: null },
];

/** Red's phone player on the ball facing Blue's goal, Blue's phone player `gap` metres in front. */
function faceOff(seed: number, gap = 1.8): MatchState {
  const state = createMatch(LINEUP, { seed, replays: false });
  for (let t = 0; t <= MATCH.kickoffWait + STEP; t += STEP) stepMatch(state);
  for (const a of state.athletes) a.pos = { x: -16 + a.id, z: a.team === 0 ? -10 : 10 };
  const me = state.athletes[0]!;
  me.pos = { x: 4, z: 0 };
  me.facing = 0;
  state.athletes[3]!.pos = { x: 4 + gap, z: 0 };
  state.athletes[3]!.facing = Math.PI;
  state.ball.owner = { kind: "athlete", id: 0 };
  state.ball.pos = { x: 4.46, y: 0.11, z: 0 };
  return state;
}

function skill(state: MatchState, stick: { x: number; z: number }, seconds = 1): MatchEvent[] {
  const events: MatchEvent[] = [];
  for (let t = 0; t < seconds; t += STEP) {
    const first = t === 0;
    stepMatch(state, new Map([[0, { move: first ? stick : { x: 0, z: 0 }, slide: first }], [3, { move: { x: 0, z: 0 } }]]));
    events.push(...state.events);
  }
  return events;
}

describe("picking a skill move", () => {
  const red = createMatch(LINEUP, { seed: 1 }).athletes[0]!;
  const blue = createMatch(LINEUP, { seed: 1 }).athletes[4]!;

  it("reads the stick against the goal the player attacks", () => {
    expect(pickSkill(red, { x: 1, z: 0 }).kind).toBe("rainbow");
    expect(pickSkill(red, { x: -1, z: 0 }).kind).toBe("dragback");
    expect(pickSkill(red, { x: 0, z: 0 }).kind).toBe("roulette");
    // Blue attacks the other way, so the same stick means the opposite.
    expect(pickSkill(blue, { x: -1, z: 0 }).kind).toBe("rainbow");
    expect(pickSkill(blue, { x: 1, z: 0 }).kind).toBe("dragback");
  });

  it("goes to the side for a crossover, or an elastico for the best dribblers", () => {
    expect(pickSkill(red, { x: 0, z: 1 }).kind).toBe("elastico");
    const plain = { ...red, dribbling: 0.8 };
    expect(pickSkill(plain, { x: 0.2, z: -1 }).kind).toBe("crossover");
  });
});

describe("a skill move", () => {
  it("keeps the ball at the feet all the way through every move", () => {
    const kinds: SkillKind[] = ["rainbow", "crossover", "elastico", "dragback", "roulette"];
    for (const kind of kinds) {
      const exit = kind === "dragback" ? { x: -1, z: 0 } : kind === "crossover" || kind === "elastico" ? { x: 0, z: 1 } : { x: 1, z: 0 };
      const f: MoveFrame = { kind, from: { x: 1, z: 0 }, exit, side: 1, pace: 5, top: 7 };
      let last = ballOffset(f, 0);
      for (let u = 0; u <= 1; u += STEP / MOVES[kind].length) {
        const o = ballOffset(f, u);
        // Never further than a long stride from the body on the ground, and never faster than a flicked ball.
        if (o.y < 0.3) expect(Math.hypot(o.x, o.z)).toBeLessThan(kind === "rainbow" ? 1.5 : 0.8);
        expect(Math.hypot(o.x - last.x, o.y - last.y, o.z - last.z), `${kind} at ${u.toFixed(2)}`).toBeLessThan(0.25);
        last = o;
      }
    }
  });

  it("lifts the ball over the defender's head in a rainbow flick", () => {
    const state = faceOff(3);
    let highest = 0;
    for (let t = 0; t < 1; t += STEP) {
      stepMatch(state, new Map([[0, { move: t === 0 ? { x: 1, z: 0 } : { x: 0, z: 0 }, slide: t === 0 }], [3, { move: { x: 0, z: 0 } }]]));
      highest = Math.max(highest, state.ball.pos.y);
    }
    expect(highest).toBeGreaterThan(2);
  });

  it("beats a close defender more often than it loses the ball", () => {
    let beat = 0;
    let lost = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const events = skill(faceOff(seed), { x: 0.3, z: 1 });
      if (events.some((e) => e.type === "skillResult" && e.result === "beat")) beat++;
      if (events.some((e) => e.type === "skillResult" && e.result === "lost")) lost++;
    }
    expect(beat).toBeGreaterThan(12);
    expect(lost).toBeLessThan(beat / 2);
  });

  it("gets past a defender standing square once the rainbow beats him", () => {
    let beaten = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const state = faceOff(seed);
      const events = skill(state, { x: 1, z: 0 }, 1.4);
      if (!events.some((e) => e.type === "skillResult" && e.result === "beat")) continue;
      beaten++;
      // Sold the wrong way, the defender opens the lane rather than leaving the dribbler stuck on his back.
      expect(state.athletes[0]!.pos.x, `seed ${seed}`).toBeGreaterThan(state.athletes[3]!.pos.x + 0.5);
    }
    expect(beaten).toBeGreaterThan(3);
  });

  it("does nothing without the ball, or while cooling down", () => {
    const state = faceOff(2);
    skill(state, { x: 0, z: 1 }, 0.1);
    const again = skill(state, { x: 0, z: -1 }, 0.1);
    expect(again.some((e) => e.type === "skill")).toBe(false);
  });

  it("gets riskier when spammed and when run straight into a man", () => {
    const state = faceOff(1, 1);
    const me = state.athletes[0]!;
    const them = state.athletes[3]!;
    me.skill.kind = "crossover";
    me.skill.exit = { x: 0, z: 1 };
    me.skill.heat = 1;
    const calm = skillRisk(me, them);
    me.skill.heat = 4;
    expect(skillRisk(me, them)).toBeGreaterThan(calm + 0.3);
    me.skill.heat = 1;
    me.skill.exit = { x: 1, z: 0 };
    expect(skillRisk(me, them)).toBeGreaterThan(calm + 0.2);
  });
});

describe("computer players", () => {
  it("use skill moves in a match", () => {
    const bots = LINEUP.map((e) => ({ ...e, seat: null }));
    const state = createMatch(bots, { seed: 7, replays: false });
    const kinds = new Set<string>();
    for (let t = 0; t < 240 && state.phase !== "fulltime"; t += STEP) {
      stepMatch(state);
      for (const e of state.events) if (e.type === "skill") kinds.add(e.kind);
    }
    expect(kinds.size).toBeGreaterThan(1);
  });
});
