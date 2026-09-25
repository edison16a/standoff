import { describe, expect, it } from "vitest";
import { CHARACTER_IDS, type CharacterId } from "../roster";
import { makeBrain, type Difficulty } from "./bots/brain";
import { pickAttack, wouldHit } from "./bots/pick-move";
import { Rng } from "./rng";
import { fightNow, hang, place, run } from "./test-kit";

/** A match of bots at one difficulty, past the countdown. */
function bots(characters: CharacterId[], difficulty: Difficulty) {
  const state = fightNow(characters, { bots: true });
  for (const f of state.fighters) f.brain = makeBrain(difficulty, f.slot);
  return state;
}

describe("bots", () => {
  it("get back to the stage after being knocked off either side", () => {
    for (const character of CHARACTER_IDS) {
      for (const side of [-1, 1]) {
        const state = bots([character, "bear"], "normal");
        const [f, other] = state.fighters;
        place(other!, 0);
        other!.brain = null;
        hang(f!, side * (state.stage.surfaces[0]!.x2 + 3.5), 1);
        f!.vel.x = side * 3;
        run(state, 240);
        expect(f!.stocks, `${character} from ${side}`).toBe(2);
        expect(f!.ground, `${character} from ${side}`).not.toBeNull();
      }
    }
  });

  it("recover from below the edge using the up move", () => {
    const state = bots(["samurai", "karate"], "hard");
    const [f, other] = state.fighters;
    place(other!, -6);
    other!.brain = null;
    hang(f!, state.stage.surfaces[0]!.x2 + 1.8, -1.5);
    f!.airJumps = 0;
    const events = run(state, 240);
    expect(events.some((e) => e.type === "swing" && e.id === 0 && e.move === "heavyUp")).toBe(true);
    expect(f!.stocks).toBe(2);
  });

  it("attack someone standing right next to them", () => {
    const state = bots(["karate", "bear"], "hard");
    const [f, target] = state.fighters;
    target!.brain = null;
    place(f!, 0, 1);
    place(target!, 1, -1);
    const events = run(state, 60);
    expect(events.some((e) => e.type === "hit" && e.attacker === 0)).toBe(true);
  });

  it("walk over to a far away opponent", () => {
    const state = bots(["samurai", "mage"], "normal");
    const [f, target] = state.fighters;
    target!.brain = null;
    place(f!, -7, 1);
    place(target!, 5, -1);
    run(state, 150);
    expect(Math.abs(f!.pos.x - target!.pos.x)).toBeLessThan(4);
  });

  it("use the ult when it is full and would connect", () => {
    const state = bots(["bear", "karate"], "hard");
    const [f, target] = state.fighters;
    target!.brain = null;
    place(f!, 0, 1);
    place(target!, 1.5, -1);
    f!.ult = 1;
    const events = run(state, 40);
    expect(events.some((e) => e.type === "ult" && e.id === 0)).toBe(true);
  });

  it("raise the shield against a wind up only when skilled enough", () => {
    const shielded = (difficulty: Difficulty) => {
      let count = 0;
      for (let seed = 1; seed <= 6; seed++) {
        const state = fightNow(["karate", "bear"], { bots: true, seed });
        const [f, bear] = state.fighters;
        f!.brain = makeBrain(difficulty, 0);
        bear!.brain = null;
        place(f!, 0, 1);
        place(bear!, 2, -1);
        for (let i = 0; i < 90; i++) {
          run(state, 1, (id, frame) => (id === 1 && frame === 0 && i % 45 === 0 ? { x: 0, y: 0, heavy: true } : undefined));
          if (f!.action === "shield") count++;
        }
      }
      return count;
    };
    expect(shielded("easy")).toBe(0);
    expect(shielded("hard")).toBeGreaterThan(0);
  });

  it("pick an attack that reaches, and only one that reaches", () => {
    const state = fightNow(["samurai", "karate"]);
    const [f, t] = state.fighters;
    place(f!, 0, 1);
    place(t!, 2.2, -1);
    expect(wouldHit(f!, t!, "jab", 1)).toBe(false);
    expect(wouldHit(f!, t!, "side", 1)).toBe(true);
    const cmd = pickAttack(f!, t!, 1, new Rng(1));
    expect(cmd).not.toBeNull();
    place(t!, 9, -1);
    expect(pickAttack(f!, t!, 1, new Rng(1))).toBeNull();
  });

  it("aim the Mage's bolt at someone far away on the same level", () => {
    const state = fightNow(["mage", "karate"]);
    const [f, t] = state.fighters;
    place(f!, -5, 1);
    place(t!, 3, -1);
    expect(wouldHit(f!, t!, "heavy", 1)).toBe(true);
    expect(wouldHit(f!, t!, "heavy", -1)).toBe(false);
  });
});
