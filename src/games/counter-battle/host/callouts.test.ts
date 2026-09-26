import { describe, expect, it } from "vitest";
import { callout, type CalloutContext } from "./callouts";

const ctx: CalloutContext = { roundsToWin: 5, sideName: (t) => (t === 0 ? "Pink team" : "Cyan team"), isHuman: (id) => id < 2 };

describe("the callouts", () => {
  it("banners and calls each round as its count in starts, and nothing for the numbers after", () => {
    const start = callout({ type: "countdown", round: 3, seconds: 3 }, [1, 1], ctx);
    expect(start?.banner).toMatchObject({ text: "Round 3", sub: "1 to 1" });
    expect(start?.say?.text).toBe("Round three");
    expect(callout({ type: "countdown", round: 3, seconds: 2 }, [1, 1], ctx)).toBeNull();
  });

  it("warns of a match point and a decider", () => {
    expect(callout({ type: "countdown", round: 6, seconds: 3 }, [4, 1], ctx)?.banner?.sub).toBe("Match point");
    expect(callout({ type: "countdown", round: 9, seconds: 3 }, [4, 4], ctx)?.say?.text).toBe("Final round");
  });

  it("names who took the round, a draw, and the winner of the match", () => {
    expect(callout({ type: "round-end", round: 2, winner: 1, score: [1, 1] }, [1, 1], ctx)?.banner).toMatchObject({ text: "Cyan team takes it", tone: 1 });
    expect(callout({ type: "round-end", round: 2, winner: null, score: [1, 0] }, [1, 0], ctx)?.banner?.text).toBe("Draw");
    // The round that wins the match leaves the words to the match.
    expect(callout({ type: "round-end", round: 7, winner: 0, score: [5, 2] }, [5, 2], ctx)).toBeNull();
    const won = callout({ type: "match-end", winner: 0, score: [5, 2] }, [5, 2], ctx);
    expect(won?.banner).toMatchObject({ text: "Pink team wins", sub: "5 to 2", tone: 0 });
    expect(won?.say?.priority).toBe(3);
  });

  it("shouts a player's head shot kill, not a computer's", () => {
    expect(callout({ type: "kill", killer: 1, victim: 2, gun: "sniper", head: true }, [0, 0], ctx)?.say?.text).toBe("Head shot!");
    expect(callout({ type: "kill", killer: 3, victim: 0, gun: "sniper", head: true }, [0, 0], ctx)).toBeNull();
  });
});
