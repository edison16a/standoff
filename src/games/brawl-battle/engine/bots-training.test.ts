import { describe, expect, it } from "vitest";
import { DIFFICULTIES, makeBrain, SKILLS } from "./bots/brain";
import { botCommand } from "./bots/think";
import { fightNow, place, run } from "./test-kit";

describe("bot difficulty levels", () => {
  it("offers the shared four levels", () => {
    expect([...DIFFICULTIES]).toEqual(["easy", "medium", "hard", "training"]);
  });

  it("gets sharper from easy to hard", () => {
    expect(SKILLS.easy.reaction).toBeGreaterThan(SKILLS.medium.reaction);
    expect(SKILLS.medium.reaction).toBeGreaterThan(SKILLS.hard.reaction);
    expect(SKILLS.easy.aggression).toBeLessThan(SKILLS.hard.aggression);
  });

  it("leaves a training bot standing still, never attacking or shielding", () => {
    const state = fightNow(["karate", "samurai"], { bots: true });
    const [dummy, sparring] = state.fighters;
    dummy!.brain = makeBrain("training", dummy!.slot);
    sparring!.brain = null;
    place(dummy!, 1.5, -1);
    place(sparring!, -1.5, 1);
    for (let i = 0; i < 300; i++) expect(botCommand(state, dummy!)).toEqual({ x: 0, y: 0 });
    const start = dummy!.pos.x;
    const events = run(state, 300);
    expect(dummy!.pos.x).toBeCloseTo(start, 3);
    const acted = events.filter((e) => (e.type === "swing" || e.type === "charge" || e.type === "jump") && e.id === dummy!.id);
    expect(acted).toEqual([]);
  });
});
