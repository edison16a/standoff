import { describe, expect, it } from "vitest";
import { fitVideo, toBox } from "./fit";

describe("fitting the camera picture into a box", () => {
  it("covers a wider box by cropping top and bottom", () => {
    const fit = fitVideo(1280, 720, 1920, 800, "cover");
    expect(fit.width).toBe(1920);
    expect(fit.height).toBe(1080);
    expect(fit.y).toBe(-140);
    expect(toBox(fit, { x: 0.5, y: 0.5 })).toEqual({ x: 960, y: 400 });
  });

  it("contains a 4 by 3 camera in a 16 by 9 box with bars at the sides", () => {
    const fit = fitVideo(640, 480, 1600, 900, "contain");
    expect(fit.height).toBe(900);
    expect(fit.width).toBe(1200);
    expect(fit.x).toBe(200);
    expect(toBox(fit, { x: 0, y: 1 })).toEqual({ x: 200, y: 900 });
  });

  it("fills the box before the video has a size", () => {
    expect(fitVideo(0, 0, 300, 200, "cover")).toEqual({ x: 0, y: 0, width: 300, height: 200 });
  });
});
