import { describe, expect, it } from "vitest";
import { splitScreen } from "../render/layout";
import type { ViewHud } from "./host-store";
import { splitPanes } from "./split-panes";

function view(name: string, color: string): ViewHud {
  return { name, color } as ViewHud;
}

describe("splitPanes", () => {
  it("puts each name in the pane the renderer draws that player in", () => {
    const views = [view("Ana", "#f00"), view("Ben", "#0f0"), view("Cleo", "#00f")];
    const panes = splitPanes(views, splitScreen(3));
    expect(panes.map((p) => p.name)).toEqual(["Ana", "Ben", "Cleo"]);
    expect(panes[1]).toEqual({ name: "Ben", color: "#0f0", rect: { x: 0, y: 0.5, w: 0.5, h: 0.5 } });
    // The spare top right quarter holds the overview, never a player.
    expect(panes.some((p) => p.rect.x === 0.5 && p.rect.y === 0)).toBe(false);
  });

  it("gives two players the left and right halves", () => {
    const panes = splitPanes([view("Ana", "#f00"), view("Ben", "#0f0")], splitScreen(2));
    expect(panes.map((p) => p.rect.x)).toEqual([0, 0.5]);
    expect(panes.every((p) => p.rect.h === 1)).toBe(true);
  });

  it("skips views that have no pane", () => {
    expect(splitPanes([view("Ana", "#f00"), view("Ben", "#0f0")], splitScreen(1))).toHaveLength(1);
  });
});
