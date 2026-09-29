import { describe, expect, it } from "vitest";
import type { MatchState } from "../engine/types";
import type { MatchView } from "../engine/view";
import { tagOf } from "./names";

// Only the fields tagOf reads, so the test stays about naming.
const view = (seat: number | null) => ({ athletes: [{ seat, build: "winger", team: 0 }] }) as unknown as MatchView;
const match = (seat: number | null) => ({ athletes: [{ seat }] }) as unknown as MatchState;
const names = new Map([[2, "Edison Law"]]);

describe("tagOf", () => {
  it("puts a present player's build after their name", () => {
    const tag = tagOf(view(2), match(2), names, 0);
    expect(tag).toMatchObject({ name: "Edison Law", human: true, detail: "Winger", shirt: "Edison Law" });
  });

  it("marks a player whose phone is away, while a computer covers", () => {
    const tag = tagOf(view(null), match(2), names, 0);
    expect(tag).toMatchObject({ name: "Edison Law", human: false, detail: "Away" });
  });

  it("gives a computer player its build name and no detail", () => {
    const tag = tagOf(view(null), match(null), names, 0);
    expect(tag.name).toBe("CPU Winger");
    expect(tag.detail).toBeUndefined();
  });
});
