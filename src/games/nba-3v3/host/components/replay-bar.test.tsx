// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useNbaStore } from "../host-store";
import { ReplayBar } from "./ReplayBar";

// jsdom gives this module a non file URL, so the stylesheet is found from the project root.
const css = readFileSync(join(process.cwd(), "src/games/nba-3v3/styles/replay.css"), "utf8");

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
  useNbaStore.setState({ replay: null });
});

describe("the replay on the big screen", () => {
  it("shows only the small replay tag, with whose view it is", () => {
    useNbaStore.setState({ replay: { view: "scorer", scorer: "Edison" } });
    act(() => root.render(<ReplayBar />));
    expect(container.querySelector(".nba-replay__bug")?.textContent).toContain("Edison's view");
    // The owner saw a black bar along the bottom over every replay: the old letterbox frame.
    expect(container.querySelector(".nba-replay__frame")).toBeNull();
    expect(container.querySelectorAll(".nba-replay > *")).toHaveLength(1);
  });

  it("says nothing about skipping, which lives on the phones", () => {
    useNbaStore.setState({ replay: { view: "defender", scorer: "Edison" } });
    act(() => root.render(<ReplayBar />));
    expect(container.textContent).not.toMatch(/skip/i);
  });

  it("draws no bars in its styles, so the replay fills the screen", () => {
    expect(css).not.toMatch(/nba-replay__frame/);
    expect(css).not.toMatch(/inset 0 -?\d+vh/);
  });
});
