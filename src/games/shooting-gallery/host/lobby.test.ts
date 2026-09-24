import { describe, expect, it } from "vitest";
import { everyoneReady, freshSetup, lineUp, startHint, type LobbySeat } from "./lobby";

const seat = (n: number, partial: Partial<LobbySeat>): LobbySeat => ({ seat: n, connected: true, ...freshSetup(), ...partial });

describe("lobby", () => {
  it("starts on its own only when every connected phone is ready", () => {
    expect(everyoneReady([seat(1, { step: "ready", ready: true }), seat(2, { step: "gun" })])).toBe(false);
    expect(everyoneReady([seat(1, { step: "ready", ready: true }), seat(2, { connected: false })])).toBe(true);
    expect(everyoneReady([seat(1, { connected: false })])).toBe(false);
  });

  it("lines up only players who have calibrated", () => {
    expect(lineUp([seat(1, { step: "calibrate" }), seat(2, { step: "gun" }), seat(3, { step: "ready", connected: false })])).toEqual([2]);
  });

  it("explains what the start button is waiting for", () => {
    expect(startHint([])).toMatch(/Scan/);
    expect(startHint([seat(1, { step: "calibrate" })])).toMatch(/calibrate/);
    expect(startHint([seat(1, { step: "ready", ready: true }), seat(2, { step: "gun" })])).toBe("Waiting for 1 to be ready");
  });
});
