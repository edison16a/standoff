// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PhoneRoomApi } from "@/platform/games/game-api";
import type { AimZone } from "./aim-math";
import { AimCalibrate } from "./AimCalibrate";
import { PhoneAim } from "./phone-aim";

const room = { seat: 1, motion: "granted", send: () => undefined, sendLossy: () => undefined, on: () => () => undefined } as unknown as PhoneRoomApi;

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
    act(() => root.render(createElement(AimCalibrate, { aim, colour: "#ff0000", zone, onDone: () => undefined })));
    return { title: host.querySelector("h3")?.textContent, outlined: host.querySelectorAll("rect[stroke-dasharray]").length > 0 };
  };

  it("points a player at the whole screen when their zone is all of it, as the big screen draws it", () => {
    expect(show({ x: 0, y: 0, w: 1, h: 1 })).toEqual({ title: "Point at the middle", outlined: false });
    expect(show()).toEqual({ title: "Point at the middle", outlined: false });
  });

  it("points a player at their own view when they have part of the screen", () => {
    expect(show({ x: 0.5, y: 0, w: 0.5, h: 1 })).toEqual({ title: "Point at the middle of your view", outlined: true });
  });
});
