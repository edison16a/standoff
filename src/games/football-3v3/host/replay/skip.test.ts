import { describe, expect, it } from "vitest";
import { SkipVotes } from "./skip";

describe("skipping a replay from the phones", () => {
  it("ends only once every phone in the match has pressed", () => {
    const votes = new SkipVotes();
    votes.start([0, 2]);
    expect(votes.vote(0)).toBe(false);
    expect(votes.vote(0)).toBe(false);
    expect({ count: votes.count, total: votes.total }).toEqual({ count: 1, total: 2 });
    expect(votes.vote(2)).toBe(true);
  });

  it("ignores a seat that has no vote, and stops waiting on one that left", () => {
    const votes = new SkipVotes();
    votes.start([0, 1]);
    expect(votes.vote(5)).toBe(false);
    votes.vote(0);
    expect(votes.setPresent(1, false)).toBe(true);
  });
});
