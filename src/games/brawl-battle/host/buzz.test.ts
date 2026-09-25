import { describe, expect, it } from "vitest";
import { createMatch } from "../engine/match";
import { buzzesFor } from "./buzz";
import { callout } from "./callouts";

const match = () =>
  createMatch([
    { character: "karate", seat: 2 },
    { character: "bear", seat: null },
    { character: "mage", seat: 4 },
  ]);

describe("moments for the phones and the announcer", () => {
  it("buzzes only the phones involved", () => {
    const m = match();
    const hit = { type: "hit", attacker: 0, target: 1, damage: 8, sound: "punch", heavy: false, speed: 9, freeze: 4, x: 0, y: 1 } as const;
    expect(buzzesFor(hit, m)).toEqual([{ seat: 2, kind: "hit" }]);
    expect(buzzesFor({ type: "ko", id: 2, by: 1, x: 0, y: 0, stocksLeft: 1 }, m)).toEqual([{ seat: 4, kind: "fall" }]);
    expect(buzzesFor({ type: "game", winner: 2 }, m)).toEqual([
      { seat: 2, kind: "lose" },
      { seat: 4, kind: "win" },
    ]);
  });

  it("calls a KO with who did it, and leaves the last one to Game", () => {
    const m = match();
    const names = ["Ana", "CPU Bear", "Ben"];
    const ko = callout({ type: "ko", id: 1, by: 0, x: 0, y: 0, stocksLeft: 1 }, m, (id) => names[id]!, 0);
    expect(ko?.banner).toEqual({ text: "KO", sub: "Ana knocked out CPU Bear", fighter: 0 });
    m.fighters[1]!.stocks = 0;
    m.fighters[2]!.stocks = 0;
    expect(callout({ type: "ko", id: 2, by: null, x: 0, y: 0, stocksLeft: 0 }, m, (id) => names[id]!, 0)).toBeNull();
  });
});
