import { describe, expect, it } from "vitest";
import { CEREMONY, CEREMONY_SPOT } from "../../engine/ceremony";
import { captainPose, matePose } from "../anim/trophy-poses";
import { CRANE_END, ceremonyAim } from "./ceremony-cam";

describe("the presentation's camera", () => {
  it("films the team from the front and never swings behind it", () => {
    for (let t = 0; t < 30; t += 0.25) {
      const aim = ceremonyAim(t, 16 / 9);
      expect(aim.pos.z).toBeGreaterThan(CEREMONY_SPOT.z + 2);
      expect(aim.pos.y).toBeGreaterThan(0.5);
      expect(aim.kind).toBe("ceremony");
    }
  });

  it("moves exactly on the clock: a hero shot, the crane, then the orbit", () => {
    expect(ceremonyAim(1, 1.6)).toEqual(ceremonyAim(1, 1.6));
    const hero = ceremonyAim(CEREMONY.up - 0.1, 1.6);
    const crane = ceremonyAim(CEREMONY.up + 0.1, 1.6);
    // The cut wide as the trophy goes up.
    expect(Math.hypot(crane.pos.x - hero.pos.x, crane.pos.z - hero.pos.z)).toBeGreaterThan(2);
    const end = ceremonyAim(CRANE_END - 0.01, 1.6);
    const orbit = ceremonyAim(CRANE_END + 0.01, 1.6);
    expect(Math.hypot(orbit.pos.x - end.pos.x, orbit.pos.y - end.pos.y, orbit.pos.z - end.pos.z)).toBeLessThan(0.3);
  });
});

describe("the presentation's poses", () => {
  it("has the captain cradle the trophy, then hold it right up", () => {
    expect(captainPose(0.5).shLX).toBeGreaterThan(-1);
    expect(captainPose(CEREMONY.up + 0.5).shLX).toBeLessThan(-2.5);
  });

  it("has the team clap, then jump with fists up once the trophy is up", () => {
    expect(matePose(1, 0.3, false).shRX).toBeGreaterThan(-1);
    const up = matePose(CEREMONY.up + 1, 0.3, false);
    expect(up.shRX).toBeLessThan(-2.3);
    // Linemen jump lower than the skill players.
    let small = 0;
    let big = 0;
    for (let t = CEREMONY.up + 0.5; t < CEREMONY.up + 3; t += 0.05) {
      small = Math.max(small, matePose(t, 0.3, false).lift);
      big = Math.max(big, matePose(t, 0.3, true).lift);
    }
    expect(big).toBeLessThan(small);
  });
});
