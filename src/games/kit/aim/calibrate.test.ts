// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PhoneRoomApi } from "@/platform/games/game-api";
import type { AimZone } from "./aim-math";
import { AimCalibrate } from "./AimCalibrate";
import { targetTitle } from "./calibrate-copy";
import { PhoneAim } from "./phone-aim";

const sent: unknown[] = [];
const room = { seat: 1, motion: "granted", send: (message: unknown) => sent.push(message), sendLossy: () => undefined, on: () => () => undefined } as unknown as PhoneRoomApi;

describe("the calibration page", () => {
  let host: HTMLDivElement;
  let root: Root;
  let aim: PhoneAim;

  beforeEach(() => {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, configurable: true });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    aim = new PhoneAim(room);
  });

  afterEach(() => {
    act(() => root.unmount());
    aim.dispose();
    host.remove();
  });

  const show = (zone?: AimZone) => {
    act(() => root.render(createElement(AimCalibrate, { aim, colour: "#ff0000", steps: ["Calibrate", "Ready"], zone, onDone: () => undefined })));
    return { title: host.querySelector(".kit-steps__title")?.textContent, lit: host.querySelectorAll(".hold-art__zone").length > 0 };
  };

  it("opens on how to hold the phone, with the first target already up on the big screen", () => {
    sent.length = 0;
    expect(show().title).toBe("Hold it like a remote");
    expect(sent).toContainEqual(expect.objectContaining({ kind: "aim-step", step: "center" }));
  });

  it("points a player at the whole screen when their zone is all of it, as the big screen draws it", () => {
    expect(show({ x: 0, y: 0, w: 1, h: 1 }).lit).toBe(false);
    expect(show().lit).toBe(false);
  });

  it("lights a player's own view when they have part of the screen", () => {
    expect(show({ x: 0.5, y: 0, w: 0.5, h: 1 }).lit).toBe(true);
  });

  it("names each target like Blade Clash does, and the middle asked for again", () => {
    expect(["center", "top-left", "bottom-right", "center"].map((t, i) => targetTitle(t as "center", i))).toEqual([
      "Point at the middle",
      "Top left corner",
      "Bottom right corner",
      "Back to the middle",
    ]);
  });
});
