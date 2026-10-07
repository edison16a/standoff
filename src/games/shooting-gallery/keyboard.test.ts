import { describe, expect, it } from "vitest";
import type { Payload } from "@/platform/protocol";
import { galleryPlayer, keyboard } from "./keyboard";

/** A fake seat that records what the binding sends and plays back what the host said. */
function seat(phase: string) {
  const sent: Payload[] = [];
  const clock = { t: 1000 };
  const ctx = {
    seat: 1,
    send: (p: Payload) => sent.push(p),
    sendLossy: (p: Payload) => sent.push(p),
    last: (kind?: string) => (kind === "state" ? { kind: "state", phase } : null),
  };
  const player = galleryPlayer(ctx, () => clock.t);
  return { sent, clock, player };
}

describe("Shooting Gallery keyboard", () => {
  it("streams the mouse as the aim and drops the panel's own aim", () => {
    const { sent, player } = seat("lobby");
    player.pointer!({ type: "move", x: 0.25, y: -0.5, button: 0 });
    expect(sent).toEqual([{ kind: "aim", x: 0.25, y: -0.5 }]);
    expect(keyboard.replaces).toEqual(["aim"]);
  });

  it("fires where the mouse is on a left click or Space, once per pump", () => {
    const { sent, clock, player } = seat("playing");
    player.pointer!({ type: "move", x: 0.1, y: 0.2, button: 0 });
    player.pointer!({ type: "down", x: 0.1, y: 0.2, button: 0 });
    expect(sent.at(-1)).toEqual({ kind: "aim-fire", x: 0.1, y: 0.2 });
    expect(player.key!("Space", true)).toBe(true);
    expect(sent.filter((p) => p.kind === "aim-fire")).toHaveLength(1);
    player.key!("Space", false);
    clock.t += 400;
    player.key!("Space", true);
    expect(sent.filter((p) => p.kind === "aim-fire")).toHaveLength(2);
  });

  it("ignores a right click and shots outside a round", () => {
    const { sent, player } = seat("countdown");
    player.pointer!({ type: "down", x: 0, y: 0, button: 0 });
    player.key!("Space", true);
    const live = seat("playing");
    live.player.pointer!({ type: "down", x: 0, y: 0, button: 2 });
    expect([...sent, ...live.sent].filter((p) => p.kind === "aim-fire")).toEqual([]);
  });
});
