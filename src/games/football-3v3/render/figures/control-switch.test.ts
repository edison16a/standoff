import { describe, expect, it } from "vitest";
import type { MatchView } from "../../engine/view";
import { ControlSwitch } from "./control-switch";

/** Just what the marker reads: the time, the phase, and who wears seat 0's ring where. */
function view(time: number, ringOn: number, phase: MatchView["phase"] = "live"): MatchView {
  const athlete = (id: number, x: number) => ({ id, team: 0, x, z: 0, seat: id === ringOn ? 0 : null });
  return { time, phase, athletes: [athlete(0, 0), athlete(1, 20)] } as unknown as MatchView;
}

describe("the control marker", () => {
  it("flies to the teammate a phone takes over, then pulses his ring", () => {
    const c = new ControlSwitch();
    c.update(view(10, 0), 1 / 30, 0);
    c.update(view(10.03, 1), 1 / 30, 0);
    expect(c.incoming(1)).toBe(true);
    for (let i = 0; i < 40; i++) c.update(view(10.06 + i / 30, 1), 1 / 30, 0);
    expect(c.incoming(1)).toBe(false);
    expect(c.pulse(1)).toBeGreaterThan(0);
  });

  it("does not fly when a new play hands everyone back, or across a cut into a replay", () => {
    const c = new ControlSwitch();
    c.update(view(10, 1), 1 / 30, 0);
    c.update(view(10.03, 0, "choose"), 1 / 30, 0);
    expect(c.incoming(0)).toBe(false);
    c.update(view(3, 1), 1 / 30, 0);
    expect(c.incoming(1)).toBe(false);
  });
});
