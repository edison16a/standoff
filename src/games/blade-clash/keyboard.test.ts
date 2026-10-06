import { describe, expect, it } from "vitest";
import type { Payload } from "@/platform/protocol";
import { BladeKeys, keyboard } from "./keyboard";
import { cut, moveAt, slashFrom, thrust, viewPoint } from "./keyboard-moves";
import { controlFromAim } from "./motion/sword-aim";
import type { ControllerState, MotionMessage } from "./protocol";

function state(phase: ControllerState["phase"] = "live"): ControllerState {
  return {
    kind: "state",
    phase,
    score: [0, 0],
    pointsToWin: 5,
    scorer: null,
    names: ["Keyboard", "Computer"],
    picks: ["knight", "samurai"],
    ready: [true, true],
    connected: [true, true],
    computer: [false, true],
    countdown: null,
    rematchVotes: [false, false],
    winner: null,
  };
}

function setup(seat = 1, initial: ControllerState | null = state()) {
  let host = initial;
  let time = 1000;
  const lossy: MotionMessage[] = [];
  const timers = { every: () => () => undefined };
  const ctx = { seat, send: () => undefined, sendLossy: (p: Payload) => lossy.push(p as MotionMessage), last: () => host };
  const keys = new BladeKeys(ctx, () => time, timers);
  return { keys, lossy, setHost: (next: ControllerState | null) => (host = next), wait: (ms: number) => (time += ms) };
}

describe("Blade Clash keyboard", () => {
  it("maps the mouse onto the player's own half of the screen", () => {
    expect(viewPoint({ x: -0.5, y: 0 }, 1)).toEqual({ x: 0, y: 0 });
    expect(viewPoint({ x: 0.5, y: 0.5 }, 2)).toEqual({ x: 0, y: 0.65 });
    expect(viewPoint({ x: 0, y: 1 }, 1)).toEqual({ x: 1.3, y: 1.3 });
  });

  it("points the sword where the mouse is, like a finger on the drag pad", () => {
    const t = setup();
    t.keys.pointer({ type: "move", x: -0.1, y: 0.4, button: 0 });
    t.keys.pump();
    const sent = t.lossy.at(-1)!;
    const expected = controlFromAim(viewPoint({ x: -0.1, y: 0.4 }, 1), 0);
    expect(sent).toMatchObject({ kind: "motion", move: 0 });
    expect(sent.yaw).toBeCloseTo(expected.yaw);
    expect(sent.pitch).toBeCloseTo(expected.pitch);
  });

  it("steps in on W and back on S, standing still with both", () => {
    const t = setup();
    t.keys.key("KeyW", true);
    expect(t.keys.frame().move).toBe(1);
    t.keys.key("ArrowDown", true);
    expect(t.keys.frame().move).toBe(0);
    t.keys.key("KeyW", false);
    expect(t.keys.frame().move).toBe(-1);
  });

  it("sends nothing before the host's first state or after the match", () => {
    const t = setup(1, null);
    t.keys.pump();
    t.setHost(state("matchOver"));
    t.keys.pump();
    expect(t.lossy).toEqual([]);
  });

  it("cuts from high left down through the middle, fast enough to land", () => {
    const t = setup();
    t.keys.key("KeyQ", true);
    t.wait(110);
    const top = t.keys.frame();
    t.wait(85);
    const middle = t.keys.frame();
    t.wait(85);
    const end = t.keys.frame();
    expect(top.yaw).toBeLessThan(-0.9);
    expect(top.pitch).toBeGreaterThan(0.9);
    expect(middle.reach).toBeGreaterThan(0.5);
    expect(end.yaw).toBeGreaterThan(0.8);
    expect(end.pitch).toBeLessThan(-0.8);
    // Well over a radian of turn in under a fifth of a second: the tip moves far faster than the hit speed.
    expect(Math.hypot(end.yaw - top.yaw, end.pitch - top.pitch) / 0.17).toBeGreaterThan(10);
  });

  it("hands the sword back to the mouse once a move is over", () => {
    const t = setup();
    t.keys.pointer({ type: "move", x: -0.3, y: -0.2, button: 0 });
    const resting = t.keys.frame();
    t.keys.key("Space", true);
    t.wait(150);
    expect(t.keys.frame().reach).toBe(1);
    t.wait(400);
    expect(t.keys.frame()).toEqual(resting);
  });

  it("slashes from the mouse's side straight through to the other", () => {
    const move = slashFrom({ x: 1, y: 0.2 }, 0);
    expect(moveAt(move, 0)).toEqual({ x: 1, y: 0.2 });
    const end = moveAt(move, 170)!;
    expect(end.x).toBeCloseTo(-0.85);
    expect(end.y).toBeCloseTo(-0.17);
    expect(moveAt(move, 1000)).toBeNull();
    // From near the middle there is no side, so it winds up high on the right first.
    expect(moveAt(slashFrom({ x: 0.1, y: 0 }, 0), 110)).toEqual({ x: 1.15, y: 1.05 });
  });

  it("starts a click's slash at once from where the blade is", () => {
    const t = setup();
    t.keys.pointer({ type: "move", x: 0, y: 0, button: 0 });
    t.keys.pointer({ type: "down", x: 0, y: 0, button: 0 });
    t.wait(200);
    expect(t.keys.frame().yaw).toBeLessThan(-0.5);
    expect(t.lossy.length).toBeGreaterThan(0);
  });

  it("holds the blade upright in front for a parry", () => {
    const t = setup();
    t.keys.key("ShiftLeft", true);
    const parry = t.keys.frame();
    expect(parry.pitch).toBeGreaterThan(1);
    expect(parry.reach).toBe(0);
    t.keys.key("ShiftLeft", false);
    expect(t.keys.frame().pitch).toBeLessThan(1);
  });

  it("winds a thrust and a cut up from the blade's own spot, never jumping", () => {
    const from = { x: 0.4, y: -0.3 };
    expect(moveAt(thrust(from, 50), 50)).toEqual(from);
    expect(moveAt(cut("overhead", from, 50), 50)).toEqual(from);
  });

  it("replaces the phone screen's motion stream", () => {
    expect(keyboard.replaces).toEqual(["motion"]);
  });
});
