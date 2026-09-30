import { describe, expect, it } from "vitest";
import { STEP } from "../engine/tuning";
import { ICON_AT, ICON_CAMERA, IconFilm } from "./icon-film";

/** Runs the icon's film to its held frame, as the showcase does. */
function held(): IconFilm {
  const film = new IconFilm();
  for (let t = 0; t < ICON_AT; t += STEP) {
    film.steer();
    film.match.step(STEP);
  }
  return film;
}

describe("the icon's film", () => {
  const m = held().match;
  const dunker = m.athletes[1]!;

  it("holds the Dunker mid drive with the ball, before he takes off", () => {
    expect(m.ball.holder).toBe(1);
    expect(dunker.action.kind).not.toBe("drive");
  });

  it("has him in front of the camera, running at it", () => {
    const toCam = { x: ICON_CAMERA.pos.x - dunker.x, z: ICON_CAMERA.pos.z - dunker.z };
    const d = Math.hypot(toCam.x, toCam.z);
    expect(d).toBeGreaterThan(1.8);
    expect(d).toBeLessThan(3);
    const look = Math.hypot(ICON_CAMERA.look.x - dunker.x, ICON_CAMERA.look.z - dunker.z);
    expect(look).toBeLessThan(0.3);
  });
});
