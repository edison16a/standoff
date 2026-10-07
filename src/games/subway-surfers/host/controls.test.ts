// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { MoveEvent } from "@/games/kit/camera";
import { Controls } from "./controls";

let controls: Controls | null = null;
afterEach(() => controls?.dispose());

function keyboardMode() {
  controls = new Controls(null);
  const heard: MoveEvent["type"][] = [];
  controls.listen((event) => heard.push(event.type));
  return { controls, heard };
}

/** A key on the page. `taken` is the admin panel's Keyboard player claiming it first. */
function key(code: string, down: boolean, taken = false): void {
  const event = new KeyboardEvent(down ? "keydown" : "keyup", { code, cancelable: true });
  if (taken) event.preventDefault();
  window.dispatchEvent(event);
}

describe("Controls in keyboard mode", () => {
  it("plays the page's own keys", () => {
    const { controls, heard } = keyboardMode();
    key("KeyD", true);
    key("Space", true);
    expect(controls.take().lane).toBe(1);
    expect(heard).toEqual(["jump", "lane"]);
  });

  it("plays the Keyboard player's moves, and skips the page keys it took so each counts once", () => {
    const { controls, heard } = keyboardMode();
    key("KeyA", true, true);
    controls.remote("left", true);
    controls.remote("duck", true);
    const intent = controls.take();
    expect(intent.lane).toBe(-1);
    expect(intent.ducking).toBe(true);
    controls.remote("duck", false);
    expect(controls.take().ducking).toBe(false);
    expect(heard).toEqual(["duck", "lane"]);
  });

  it("ignores the Keyboard player's moves in camera mode", () => {
    controls = new Controls({ onMove: () => () => undefined, moves: () => null } as never);
    controls.remote("right", true);
    expect(controls.take().lane).toBe(0);
  });
});
