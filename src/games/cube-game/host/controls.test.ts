// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { Controls } from "./controls";

let controls: Controls | null = null;
afterEach(() => controls?.dispose());

function keys(players: number) {
  const presses: [number, number][] = [];
  controls = new Controls(null, players, (slot, at) => presses.push([slot, at]), () => undefined);
  return { controls, presses };
}

/** A key on the page. `taken` is the admin panel's Keyboard player claiming it first. */
function key(code: string, taken = false): void {
  const event = new KeyboardEvent("keydown", { code, cancelable: true });
  if (taken) event.preventDefault();
  window.dispatchEvent(event);
}

describe("Cube Game controls with keys", () => {
  it("presses for the page's own keys, by player", () => {
    const { presses } = keys(2);
    key("Space");
    key("Enter");
    expect(presses.map(([slot]) => slot)).toEqual([1, 2]);
  });

  it("skips a page key the Keyboard player took and presses for its jump instead, timed from its key", () => {
    const { controls, presses } = keys(2);
    key("Space", true);
    expect(presses).toEqual([]);
    controls.remote(2, 950, 1000);
    expect(presses).toEqual([[2, 950]]);
  });

  it("never times a jump from the future or from long ago", () => {
    const { controls, presses } = keys(1);
    controls.remote(1, 5000, 1000);
    controls.remote(1, 0, 2000);
    expect(presses).toEqual([
      [1, 1000],
      [1, 1750],
    ]);
  });

  it("gives player 2's jumps to player 1 when alone", () => {
    const { controls, presses } = keys(1);
    controls.remote(2, 1000, 1000);
    expect(presses).toEqual([[1, 1000]]);
  });
});
