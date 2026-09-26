import { describe, expect, it } from "vitest";
import { needsAir, planPass, shotAimZ } from "./assist";
import { newBall, stepBall, type Contact } from "./ball";
import { createMatch, stepMatch, type Entrant } from "./match";
import { loftVelocity } from "./passing";
import { PITCH, STEP } from "./tuning";
import type { MatchState } from "./types";

const LINEUP: Entrant[] = [
  { team: 0, character: "echeverri", seat: 1 },
  { team: 0, character: "brandao", seat: null },
  { team: 0, character: "okemba", seat: null },
  { team: 1, character: "holmvik", seat: null },
  { team: 1, character: "lacerda", seat: null },
  { team: 1, character: "ashworth", seat: null },
];

/** A frozen scene: Red's player on the ball, everyone else placed by hand. */
function scene(me: { x: number; z: number }, mates: { x: number; z: number }[], foes: { x: number; z: number }[] = []): MatchState {
  const state = createMatch(LINEUP, { seed: 3, replays: false });
  state.phase = "play";
  const [a, b, c, d, e, f] = state.athletes;
  a!.pos = { ...me };
  [b, c].forEach((m, i) => (m!.pos = mates[i] ?? { x: -12, z: -8 + i * 16 }));
  [d, e, f].forEach((o, i) => (o!.pos = foes[i] ?? { x: -14, z: -9 + i * 9 }));
  state.ball.owner = { kind: "athlete", id: 0 };
  return state;
}

describe("the pass assist", () => {
  it("passes to the team mate the stick points at", () => {
    const state = scene({ x: 0, z: 0 }, [{ x: 0, z: -7 }, { x: 6, z: 5 }]);
    expect(planPass(state, state.athletes[0]!, { x: 0, z: -1 })).toMatchObject({ kind: "pass", to: 1 });
    // Roughly is enough: twenty degrees off still finds them.
    expect(planPass(state, state.athletes[0]!, { x: 0.8, z: 0.6 })).toMatchObject({ kind: "pass", to: 2 });
  });

  it("never shoots on a tap, even pointing at goal", () => {
    const state = scene({ x: 14, z: 0 }, [{ x: -5, z: -6 }, { x: -5, z: 6 }]);
    expect(planPass(state, state.athletes[0]!, { x: 1, z: 0 }).kind).toBe("space");
    expect(planPass(state, state.athletes[0]!, null).kind).toBe("pass");
  });

  it("plays a ball into space where there is nobody", () => {
    const state = scene({ x: 0, z: 0 }, [{ x: -8, z: -6 }, { x: -8, z: 6 }]);
    const plan = planPass(state, state.athletes[0]!, { x: 0, z: 1 });
    expect(plan.kind).toBe("space");
  });
});

describe("the shot aim", () => {
  it("aims at the side of the goal the stick points at", () => {
    const state = scene({ x: 12, z: 0 }, [{ x: -5, z: -6 }, { x: -5, z: 6 }]);
    const me = state.athletes[0]!;
    expect(shotAimZ(me, { x: 1, z: -0.14 })!).toBeLessThan(-0.5);
    expect(shotAimZ(me, { x: 1, z: 0.14 })!).toBeGreaterThan(0.5);
    expect(Math.abs(shotAimZ(me, { x: 1, z: 1 })!)).toBeLessThanOrEqual(PITCH.goalHalfWidth);
  });

  it("leaves a centred stick to the game, and reads up and down as far and near", () => {
    const state = scene({ x: 12, z: 0 }, []);
    const me = state.athletes[0]!;
    expect(shotAimZ(me, { x: 0, z: 0 })).toBeNull();
    expect(shotAimZ(me, { x: -0.2, z: -1 })!).toBeLessThan(0);
    expect(shotAimZ(me, { x: -0.2, z: 1 })!).toBeGreaterThan(0);
  });
});

describe("the air or ground choice", () => {
  it("lofts long balls and balls over a defender, and keeps short clear ones on the ground", () => {
    const state = scene({ x: -10, z: 0 }, [{ x: -4, z: 0 }, { x: 8, z: 4 }], [{ x: 0, z: 2 }]);
    const me = state.athletes[0]!;
    expect(needsAir(state, me, { x: -4, z: 0 })).toBe(false);
    expect(needsAir(state, me, { x: 8, z: 4 })).toBe(true);
    expect(needsAir(state, me, { x: 3, z: 3 })).toBe(true);
  });

  it("drops a lofted pass on the spot", () => {
    for (const d of [8, 14, 22]) {
      const ball = newBall();
      ball.pos = { x: 0, y: 0.11, z: 0 };
      ball.vel = loftVelocity(ball.pos, { x: d, z: 2 });
      const contacts: Contact[] = [];
      for (let t = 0; t < 5 && contacts.length === 0; t += STEP) stepBall(ball, STEP, contacts, { flightOnly: true });
      expect(Math.hypot(ball.pos.x - d, ball.pos.z - 2)).toBeLessThan(0.4);
    }
  });

  it("turns a pointed press into a pass that reaches the team mate", () => {
    const state = scene({ x: -2, z: 0 }, [{ x: -2, z: -7 }, { x: -10, z: 8 }]);
    let reached = false;
    stepMatch(state, new Map([[0, { move: { x: 0, z: 0 }, shootDown: true, aim: { x: 0, z: -1 } }]]));
    stepMatch(state, new Map([[0, { move: { x: 0, z: 0 }, shootUp: true, aim: { x: 0, z: -1 } }]]));
    for (let t = 0; t < 3 && !reached; t += STEP) {
      stepMatch(state);
      reached = state.events.some((e) => e.type === "control" && e.athlete === 1);
    }
    expect(reached).toBe(true);
  });
});
