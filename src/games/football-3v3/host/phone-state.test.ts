import { describe, expect, it } from "vitest";
import { peopleMatch, run, snap } from "../engine/test-helpers";
import { phoneStateSchema } from "../protocol";
import { phoneState, type PhoneContext } from "./phone-state";
import { SkipVotes } from "./replay/skip";

const seat = { connected: true, pick: "reed" as const, ready: true, team: 0 as const, role: "qb" as const };

function context(over: Partial<PhoneContext>): PhoneContext {
  return { phase: "lobby", seat, taken: [], match: null, callout: null, votes: null, ...over };
}

describe("a phone's screen state", () => {
  it("gives the QB the play call, then the hike, then the throw stick", () => {
    const m = peopleMatch();
    const call = phoneState(context({ phase: m.phase, match: m }), 0);
    expect(call.pad).toBe("choose");
    expect(call.choose?.options).toEqual(["throw", "kick"]);
    m.choose(m.bySeat(0)!.id, "throw");
    const hike = phoneState(context({ phase: m.phase, match: m }), 0);
    expect(hike.pad).toBe("qb");
    expect(hike.hikeLeft).toBe(5);
    snap(m);
    run(m, 0.3);
    const live = phoneState(context({ phase: m.phase, match: m }), 0);
    expect(live.withBall).toBe(true);
    expect(live.canThrow).toBe(true);
    expect(phoneStateSchema.safeParse(live).success).toBe(true);
  });

  it("shows every player in the game a Skip vote during a replay", () => {
    const m = peopleMatch();
    const votes = new SkipVotes();
    votes.start([0, 1, 2, 3]);
    votes.vote(1);
    const mine = phoneState(context({ phase: "replay", match: m, votes, callout: { text: "Touchdown", sub: "Banks", colour: "#fff" } }), 0);
    expect(mine.pad).toBe("wait");
    expect(mine.skip).toEqual({ agreed: false, count: 1, total: 4 });
    expect(phoneStateSchema.safeParse(mine).success).toBe(true);
    expect(phoneState(context({ phase: "replay", match: m, votes }), 1).skip?.agreed).toBe(true);
  });

  it("lets the QB defend after an interception", () => {
    const m = peopleMatch();
    snap(m);
    m.play!.intercepted = true;
    m.ball.holder = m.bySeat(2)!.id;
    expect(phoneState(context({ phase: "live", match: m }), 0).pad).toBe("defense");
  });

  it("has the final result and the player's numbers at the whistle", () => {
    const m = peopleMatch();
    m.phase = "over";
    m.winner = 1;
    m.bySeat(0)!.stats.passYards = 120;
    const over = phoneState(context({ phase: "over", match: m }), 0);
    expect(over.result).toBe("lose");
    expect(over.stats?.passYards).toBe(120);
    expect(phoneStateSchema.safeParse(over).success).toBe(true);
  });
});
