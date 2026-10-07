import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../engine/events";
import { STEP } from "../engine/tuning";
import { ICON_AT, ICON_CAMERA, IconFilm } from "./icon-film";

/** Runs the icon's film to its held frame, as the showcase does, keeping what happened on the way. */
function held(): { film: IconFilm; events: MatchEvent[] } {
  const film = new IconFilm();
  const events: MatchEvent[] = [];
  let t = 0;
  for (; t < ICON_AT; t += STEP) {
    film.steer(t + STEP);
    film.match.step(STEP);
    events.push(...film.match.drainEvents());
  }
  return { film, events };
}

describe("the icon's film", () => {
  const { film, events } = held();
  const m = film.match;
  const shooter = m.athletes[0]!;
  const defender = m.athletes[3]!;

  it("holds the ball just out of the Shooter's hands on a straight up jumper", () => {
    const shot = events.find((e) => e.type === "shot");
    expect(shot).toBeDefined();
    expect(m.ball.holder).toBeNull();
    expect(shooter.action.kind).toBe("shoot");
    expect(shooter.y).toBeGreaterThan(0.2);
    // No stepback: the defender started outside the chest.
    expect(Math.hypot(shooter.x + 2.5, shooter.z - 6.4)).toBeLessThan(0.15);
  });

  it("has the defender in the air in front of him, facing him, and no block", () => {
    expect(defender.action.kind).toBe("block");
    expect(defender.y).toBeGreaterThan(0.4);
    expect(Math.hypot(defender.x - shooter.x, defender.z - shooter.z)).toBeLessThan(1.1);
    expect(Math.cos(defender.yaw - shooter.yaw)).toBeLessThan(-0.8);
    expect(events.some((e) => e.type === "block")).toBe(false);
  });

  it("keeps both of them and the ball in front of the camera", () => {
    const look = ICON_CAMERA.look.clone().sub(ICON_CAMERA.pos).setY(0).normalize();
    for (const p of [shooter, defender, m.ball.pos]) {
      const to = { x: p.x - ICON_CAMERA.pos.x, z: p.z - ICON_CAMERA.pos.z };
      const d = Math.hypot(to.x, to.z);
      expect((to.x * look.x + to.z * look.z) / d).toBeGreaterThan(0.9);
    }
  });
});
