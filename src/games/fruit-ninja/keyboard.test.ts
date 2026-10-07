import { describe, expect, it } from "vitest";
import type { Payload } from "@/platform/protocol";
import { keyboard, slicerPlayer } from "./keyboard";

function seat() {
  const sent: Payload[] = [];
  const clock = { t: 0 };
  const ctx = { seat: 2, send: (p: Payload) => sent.push(p), sendLossy: (p: Payload) => sent.push(p), last: () => null };
  return { sent, clock, player: slicerPlayer(ctx, () => clock.t) };
}

describe("Fruit Slicer keyboard", () => {
  it("streams the mouse as the blade, at most at the phone's rate", () => {
    const { sent, clock, player } = seat();
    player.pointer!({ type: "move", x: -0.5, y: 0.5, button: 0 });
    clock.t += 4;
    player.pointer!({ type: "move", x: 0.5, y: 0.5, button: 0 });
    expect(sent).toEqual([{ kind: "aim", x: -0.5, y: 0.5 }]);
    clock.t += 30;
    player.tick!();
    expect(sent.at(-1)).toEqual({ kind: "aim", x: 0.5, y: 0.5 });
  });

  it("sends nothing for a click: only the swipe slices", () => {
    const { sent, player } = seat();
    player.pointer!({ type: "down", x: 0, y: 0, button: 0 });
    expect(sent).toEqual([]);
    expect(keyboard.replaces).toEqual(["aim"]);
  });
});
