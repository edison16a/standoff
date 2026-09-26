import { describe, expect, it } from "vitest";
import type { SeatView } from "../protocol/messages";
import { teamRows } from "./team-rows";

const seat = (over: Partial<SeatView>): SeatView => ({ name: "P", weapon: "rifle", ready: false, connected: true, playing: false, ...over });

describe("the ready page's team list", () => {
  it("shows our own tap before the host has heard it", () => {
    const rows = teamRows([seat({ ready: false }), seat({ ready: true })], 1, true);
    expect(rows.map((r) => r.ready)).toEqual([true, true]);
  });

  it("shows our own Not ready at once too, and trusts the host for everyone else", () => {
    const rows = teamRows([seat({ ready: true }), seat({ ready: false })], 1, false);
    expect(rows.map((r) => r.ready)).toEqual([false, false]);
  });

  it("numbers seats from one and leaves out empty ones", () => {
    const rows = teamRows([seat({}), seat({ connected: false }), seat({})], 3, false);
    expect(rows.map((r) => r.seat)).toEqual([1, 3]);
  });
});
