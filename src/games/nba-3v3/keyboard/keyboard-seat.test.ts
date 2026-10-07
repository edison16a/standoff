import { describe, expect, it } from "vitest";
import type { KeyboardContext } from "@/platform/keyboard";
import type { Payload } from "@/platform/protocol";
import type { CourtState, PhoneState } from "../protocol";
import { buttonFor, JOG, NbaKeyboardSeat } from "./keyboard-seat";

function court(over: Partial<CourtState> = {}): CourtState {
  return {
    team: 0, score: [0, 0], shotClock: 12, hasBall: true, attacking: true, holder: "Me", mustClear: false, canSteal: false, stealReach: false,
    defending: false, guard: "off", freeThrow: null, meter: { fullMs: 820, greenMs: 656, halfMs: 60, goldMs: 12 }, onFire: false, checking: false, countdown: null,
    ...over,
  };
}

function state(c: CourtState | null, over: Partial<PhoneState> = {}): PhoneState {
  return { kind: "state", phase: "live", name: "Keyboard", taken: [], pick: "shooter", ready: true, team: 0, playing: true, court: c, replay: null, result: null, ...over };
}

/** A seat with a fake clock and a record of what it sent. */
function seat(s: PhoneState) {
  const sent: Payload[] = [];
  const box = { state: s, t: 0 };
  const ctx: KeyboardContext = { seat: 1, send: (p) => sent.push(p), sendLossy: (p) => sent.push(p), last: () => box.state as unknown as Payload };
  return { player: new NbaKeyboardSeat(ctx, () => box.t), sent, box };
}

describe("keys to phone buttons", () => {
  it("shoots, passes and makes a move with the ball", () => {
    expect(buttonFor("shoot", court())).toBe("shoot");
    expect(buttonFor("pass", court())).toBe("pass");
    expect(buttonFor("skill", court())).toBe("defend");
  });

  it("guards, blocks and steals on defence", () => {
    const d = court({ hasBall: false, attacking: false, defending: true, canSteal: true });
    expect(buttonFor("guard", d)).toBe("shoot");
    expect(buttonFor("shoot", d)).toBe("pass");
    expect(buttonFor("pass", d)).toBe("defend");
    expect(buttonFor("skill", d)).toBeNull();
  });

  it("only shoots at the line once set", () => {
    const ft = (ready: boolean) => court({ freeThrow: { mine: true, n: 1, of: 2, ready } });
    expect(buttonFor("shoot", ft(true))).toBe("shoot");
    expect(buttonFor("shoot", ft(false))).toBeNull();
    expect(buttonFor("pass", ft(true))).toBeNull();
  });
});

describe("the keyboard seat", () => {
  it("sends the measured hold of Space before letting go of Shoot", () => {
    const { player, sent, box } = seat(state(court()));
    player.key("Space", true);
    box.t = 640;
    player.key("Space", false);
    expect(sent).toEqual([
      { kind: "pad-press", button: "shoot", down: true, x: 0, y: 0 },
      { kind: "release", heldMs: 640 },
      { kind: "pad-press", button: "shoot", down: false, x: 0, y: 0 },
    ]);
  });

  it("holds a free throw as long as Space is held", () => {
    const { player, sent, box } = seat(state(court({ freeThrow: { mine: true, n: 1, of: 2, ready: true } })));
    player.key("Space", true);
    for (box.t = 0; box.t < 3000; box.t += 33) player.tick();
    expect(sent.some((p) => p.kind === "release")).toBe(false);
    player.key("Space", false);
    expect(sent.find((p) => p.kind === "release")).toEqual({ kind: "release", heldMs: 3003 });
  });

  it("jogs on the keys and sprints with Shift", () => {
    const { player } = seat(state(court()));
    player.key("KeyW", true);
    expect(player.vector().y).toBeCloseTo(JOG);
    player.key("ShiftLeft", true);
    expect(player.vector().y).toBeCloseTo(1);
  });

  it("lets go of the button it pressed, even after the ball changed hands", () => {
    const { player, sent, box } = seat(state(court({ hasBall: false, attacking: false, defending: true })));
    player.key("KeyF", true);
    box.state = state(court());
    player.key("KeyF", false);
    expect(sent.at(-1)).toEqual({ kind: "pad-press", button: "shoot", down: false, x: 0, y: 0 });
    expect(sent.some((p) => p.kind === "release")).toBe(false);
  });

  it("holds Guard on the right mouse button", () => {
    const { player, sent } = seat(state(court({ hasBall: false, attacking: false, defending: true })));
    player.pointer({ type: "down", button: 2 });
    expect(sent.at(-1)).toMatchObject({ kind: "pad-press", button: "shoot", down: true });
  });

  it("readies up in the lobby and skips the replay on Enter", () => {
    const lobby = seat(state(null, { phase: "lobby", ready: false }));
    lobby.player.key("Enter", true);
    expect(lobby.sent).toEqual([{ kind: "ready", ready: true }]);
    const replay = seat(state(null, { phase: "replay", replay: { voted: false, votes: [] } }));
    replay.player.key("Enter", true);
    expect(replay.sent).toEqual([{ kind: "skip" }]);
  });
});
