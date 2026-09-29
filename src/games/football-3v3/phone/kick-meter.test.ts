import { describe, expect, it } from "vitest";
import { meterAim, meterPower } from "../engine/kick";
import { followMeter, tapMeter } from "./kick-meter";

describe("the phone's kick meters", () => {
  it("starts the aim meter when the host starts a kick", () => {
    expect(followMeter(null, null, "aim", 1000)).toEqual({ stage: "aim", since: 1000, aim: null });
  });

  it("sends the reading drawn at the tap and moves straight on to power", () => {
    const aim = followMeter(null, null, "aim", 0)!;
    const tap = tapMeter(aim, 400)!;
    expect(tap.value).toBeCloseTo(meterAim(0.4), 6);
    expect(tap.next).toEqual({ stage: "power", since: 400, aim: tap.value });
    const kick = tapMeter(tap.next, 1150)!;
    expect(kick.value).toBeCloseTo(meterPower(0.75), 6);
    expect(kick.next.stage).toBe("done");
    expect(tapMeter(kick.next, 1300)).toBeNull();
  });

  it("never restarts a meter for a late state that repeats the host's stage", () => {
    const power = tapMeter(followMeter(null, null, "aim", 0), 400)!.next;
    expect(followMeter(power, "aim", "aim", 500)).toBe(power);
    // The host catches up with the tap: no change on the phone.
    expect(followMeter(power, "aim", "power", 520)).toBe(power);
    const done = tapMeter(power, 900)!.next;
    expect(followMeter(done, "power", "power", 950)).toBe(done);
  });

  it("follows the host when it stops the aim meter itself", () => {
    const aim = followMeter(null, null, "aim", 0);
    expect(followMeter(aim, "aim", "power", 6000)).toEqual({ stage: "power", since: 6000, aim: null });
  });

  it("clears once the kick is away", () => {
    expect(followMeter({ stage: "done", since: 0, aim: 0.1 }, "power", null, 2000)).toBeNull();
  });
});
