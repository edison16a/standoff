// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Board } from "../../render/hud/board";
import { useFootballStore } from "../host-store";
import { GameHud } from "./GameHud";

const BOARD: Board = {
  teams: [
    { team: 0, code: "AAA", color: "#f00", score: 7, ball: true },
    { team: 1, code: "BBB", color: "#00f", score: 0, ball: false },
  ],
  period: "1st",
  clock: "4:00",
  situation: "1st & 10",
  spot: "AAA 25",
  target: "First to 21",
  countdown: null,
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  useFootballStore.setState(useFootballStore.getInitialState());
});

describe("the broadcast graphics", () => {
  it("show the score bug in play", () => {
    useFootballStore.setState({ phase: "live", board: BOARD });
    act(() => root.render(<GameHud />));
    expect(container.querySelector(".fb-board")).not.toBeNull();
  });

  // The score bug is a dark bar along the bottom; left over a replay it covers the run into the end zone.
  it("drop the score bug for the replay, so the replay fills the screen", () => {
    useFootballStore.setState({ phase: "replay", board: BOARD });
    act(() => root.render(<GameHud />));
    expect(container.querySelector(".fb-board")).toBeNull();
    expect(container.textContent).not.toMatch(/skip/i);
  });
});
