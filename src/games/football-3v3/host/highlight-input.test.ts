import { describe, expect, it } from "vitest";
import { callPlay, PEOPLE, run } from "../engine/test-helpers";
import { phoneMessageSchema } from "../protocol";
import { routePhone, type InputTarget } from "./inputs";
import { MatchDriver } from "./match-driver";

/** Just enough of the session for a phone's message to reach the driver, counting skip votes. */
function target(driver: MatchDriver) {
  const votes: number[] = [];
  const t = { driver, vote: (seat: number) => (votes.push(seat), false) } as unknown as InputTarget;
  return { t, votes };
}

/** A live play with the QB on seat 0 holding the ball. */
function live(): MatchDriver {
  const driver = new MatchDriver(PEOPLE, 7, "easy");
  const m = driver.match;
  const qb = m.qbOf(m.offense);
  callPlay(m, qb.id, "throw");
  m.press(qb.id, "hike");
  run(m, 1, () => m.carrier() === qb);
  return driver;
}

const parse = (payload: unknown) => phoneMessageSchema.parse(payload);

describe("the highlight message from the QB's phone", () => {
  it("reads a slot or null, and refuses anything else", () => {
    expect(parse({ kind: "highlight", slot: 2 })).toEqual({ kind: "highlight", slot: 2 });
    expect(parse({ kind: "highlight", slot: null })).toEqual({ kind: "highlight", slot: null });
    expect(phoneMessageSchema.safeParse({ kind: "highlight", slot: 4 }).success).toBe(false);
    expect(phoneMessageSchema.safeParse({ kind: "highlight" }).success).toBe(false);
  });

  it("lights the runner on the big screen without a refresh or a skip vote", () => {
    const driver = live();
    const seat = driver.match.qbOf(driver.match.offense).seat!;
    const { t, votes } = target(driver);
    expect(routePhone(t, seat, parse({ kind: "highlight", slot: 1 }))).toBe(false);
    expect(driver.match.play!.hot).toBe(1);
    expect(votes).toEqual([]);
    routePhone(t, seat, parse({ kind: "highlight", slot: null }));
    expect(driver.match.play!.hot).toBeNull();
  });

  it("is ignored while the match is held for a replay, and cleared when the phone drops", () => {
    const driver = live();
    const seat = driver.match.qbOf(driver.match.offense).seat!;
    const { t } = target(driver);
    driver.held = true;
    routePhone(t, seat, parse({ kind: "highlight", slot: 0 }));
    expect(driver.match.play!.hot).toBeNull();
    driver.held = false;
    routePhone(t, seat, parse({ kind: "highlight", slot: 0 }));
    expect(driver.match.play!.hot).toBe(0);
    driver.setOnline(seat, false);
    expect(driver.match.play!.hot).toBeNull();
  });
});
