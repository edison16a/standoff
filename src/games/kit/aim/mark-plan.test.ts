import { describe, expect, it } from "vitest";
import { planMark } from "./overlay-draw";

const ana = { seat: 1, name: "Ana", connected: true };
const ben = { seat: 2, name: "Ben", connected: true };
const screen = { x: 0, y: 0, w: 1280, h: 720 };

describe("a calibration target's words on the big screen", () => {
  it("names everyone looking for it, under it in the middle of the screen", () => {
    expect(planMark({ x: 640, y: 360 }, [ana, ben], screen)).toMatchObject({ words: ["Ana, point here", "Ben, point here"], above: false, align: "center" });
  });

  it("puts the words above a target near the bottom, so they stay on screen", () => {
    expect(planMark({ x: 640, y: 650 }, [ana], screen).above).toBe(true);
  });

  it("lines the words up with a target near a side edge", () => {
    expect(planMark({ x: 60, y: 72 }, [ana], screen).align).toBe("start");
    expect(planMark({ x: 1220, y: 72 }, [ana], screen).align).toBe("end");
  });
});
