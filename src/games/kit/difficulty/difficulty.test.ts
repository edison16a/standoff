import { describe, expect, it } from "vitest";
import { BOT_LEVELS, BOT_SKILL, DEFAULT_BOT_LEVEL, isBotLevel } from "./difficulty";

describe("bot difficulty", () => {
  it("defaults to easy", () => {
    expect(DEFAULT_BOT_LEVEL).toBe("easy");
  });

  it("gets sharper from easy to hard", () => {
    expect(BOT_SKILL.easy.accuracy).toBeLessThan(BOT_SKILL.medium.accuracy);
    expect(BOT_SKILL.medium.accuracy).toBeLessThan(BOT_SKILL.hard.accuracy);
    expect(BOT_SKILL.hard.reaction).toBeLessThan(BOT_SKILL.easy.reaction);
  });

  it("freezes bots in training", () => {
    expect(BOT_SKILL.training.acts).toBe(false);
    expect(BOT_SKILL.training.speed).toBe(0);
  });

  it("checks values from the network", () => {
    for (const level of BOT_LEVELS) expect(isBotLevel(level)).toBe(true);
    expect(isBotLevel("insane")).toBe(false);
    expect(isBotLevel(3)).toBe(false);
  });
});
