import { describe, expect, it } from "vitest";
import type { Payload } from "@/platform/protocol";
import { inZone, keyboard, paintballPlayer } from "./keyboard";

/** A fake seat with the host's last state to play back, in the left half of a split screen. */
function seat(overrides: Record<string, unknown> = {}) {
  const sent: Payload[] = [];
  const host = { state: { kind: "state", phase: "match", playing: true, armed: true, alive: true, zone: { x: 0, y: 0, w: 0.5, h: 1 }, ...overrides } as Payload };
  const ctx = { seat: 1, send: (p: Payload) => sent.push(p), sendLossy: (p: Payload) => sent.push(p), last: () => host.state };
  return { sent, host, player: paintballPlayer(ctx, () => 0) };
}

describe("Paintball Battle keyboard", () => {
  it("maps the mouse into the seat's own view", () => {
    expect(inZone({ x: -0.5, y: 0 }, { x: 0, y: 0, w: 0.5, h: 1 })).toEqual({ x: 0, y: 0 });
    expect(inZone({ x: 0.5, y: 1 }, { x: 0, y: 0, w: 0.5, h: 1 })).toEqual({ x: 1, y: 1 });
    expect(inZone({ x: 0.3, y: -0.2 }, null)).toEqual({ x: 0.3, y: -0.2 });
  });

  it("pulls the trigger with the aim of the press and lets go on release", () => {
    const { sent, player } = seat();
    player.pointer!({ type: "move", x: -0.5, y: 0, button: 0 });
    player.pointer!({ type: "down", x: -0.5, y: 0, button: 0 });
    player.key!("Space", true);
    player.pointer!({ type: "up", x: -0.5, y: 0, button: 0 });
    expect(sent).toEqual([
      { kind: "aim", x: 0, y: 0 },
      { kind: "aim-fire", x: 0, y: 0 },
      { kind: "trigger", down: true },
    ]);
    player.key!("Space", false);
    expect(sent.at(-1)).toEqual({ kind: "trigger", down: false });
  });

  it("switches crouch on and off with C, and reloads with R", () => {
    const { sent, player } = seat();
    player.key!("KeyC", true);
    player.key!("KeyC", false);
    player.key!("KeyC", true);
    player.key!("KeyR", true);
    expect(sent).toEqual([
      { kind: "crouch", down: true },
      { kind: "crouch", down: false },
      { kind: "reload" },
    ]);
    expect(keyboard.replaces).toContain("crouch");
  });

  it("stays quiet before the fight is on and stands up back in the lobby", () => {
    const waiting = seat({ armed: false });
    waiting.player.key!("Space", true);
    waiting.player.key!("KeyC", true);
    expect(waiting.sent).toEqual([]);

    const { sent, host, player } = seat();
    player.tick!();
    player.key!("KeyC", true);
    host.state = { kind: "state", phase: "lobby", playing: false };
    player.tick!();
    expect(sent.at(-1)).toEqual({ kind: "crouch", down: false });
  });
});
