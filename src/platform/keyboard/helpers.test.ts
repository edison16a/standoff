import { describe, expect, it } from "vitest";
import { ButtonKeys } from "./button-keys";
import { KeyState, isSystemKey } from "./key-state";
import { MouseAim, toStagePoint } from "./mouse-aim";
import { StickKeys, stickVector } from "./stick-keys";

describe("stickVector", () => {
  it("points along one axis for one key", () => {
    expect(stickVector(true, false, false, false)).toEqual({ x: 0, y: 1 });
    expect(stickVector(false, false, true, false)).toEqual({ x: -1, y: 0 });
  });

  it("scales a diagonal to length one", () => {
    const v = stickVector(true, false, false, true);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1);
    expect(v.x).toBeCloseTo(Math.SQRT1_2);
    expect(v.y).toBeCloseTo(Math.SQRT1_2);
  });

  it("cancels opposite keys", () => {
    expect(stickVector(true, true, true, true)).toEqual({ x: 0, y: 0 });
    expect(stickVector(true, true, false, true)).toEqual({ x: 1, y: 0 });
  });
});

describe("StickKeys", () => {
  it("reads W A S D and the arrows together by default", () => {
    const stick = new StickKeys();
    expect(stick.key("KeyW", true)).toBe(true);
    expect(stick.key("ArrowRight", true)).toBe(true);
    expect(stick.vector().x).toBeCloseTo(Math.SQRT1_2);
    expect(stick.key("KeyJ", true)).toBe(false);
  });

  it("holds a direction until the last of its keys is up", () => {
    const stick = new StickKeys();
    stick.key("KeyW", true);
    stick.key("ArrowUp", true);
    stick.key("KeyW", false);
    expect(stick.vector()).toEqual({ x: 0, y: 1 });
    stick.key("ArrowUp", false);
    expect(stick.vector()).toEqual({ x: 0, y: 0 });
    expect(stick.active).toBe(false);
  });

  it("can take only one set, leaving the other free", () => {
    const stick = new StickKeys("wasd");
    expect(stick.key("ArrowUp", true)).toBe(false);
    expect(stick.key("KeyS", true)).toBe(true);
    expect(stick.vector()).toEqual({ x: 0, y: -1 });
    stick.release();
    expect(stick.vector()).toEqual({ x: 0, y: 0 });
  });
});

describe("ButtonKeys", () => {
  function setup() {
    let time = 0;
    const log: string[] = [];
    const buttons = new ButtonKeys(
      { shoot: ["Space", "KeyJ"], use: ["KeyE"] },
      { press: (b) => log.push(`down ${b}`), release: (b, ms) => log.push(`up ${b} ${ms}`) },
      () => time,
    );
    return { buttons, log, advance: (ms: number) => (time += ms) };
  }

  it("presses once and releases once however the keys overlap", () => {
    const { buttons, log, advance } = setup();
    buttons.key("Space", true);
    buttons.key("KeyJ", true);
    advance(250);
    buttons.key("Space", false);
    expect(buttons.isHeld("shoot")).toBe(true);
    buttons.key("KeyJ", false);
    expect(log).toEqual(["down shoot", "up shoot 250"]);
  });

  it("ignores keys it does not know and lists what is held", () => {
    const { buttons } = setup();
    expect(buttons.key("KeyQ", true)).toBe(false);
    buttons.key("KeyE", true);
    expect(buttons.held()).toEqual(["use"]);
  });

  it("lets go of everything with a release each", () => {
    const { buttons, log } = setup();
    buttons.key("Space", true);
    buttons.key("KeyE", true);
    buttons.release();
    expect(buttons.held()).toEqual([]);
    expect(log.filter((line) => line.startsWith("up"))).toHaveLength(2);
  });
});

describe("KeyState", () => {
  it("passes one down and one up per press", () => {
    const keys = new KeyState();
    expect(keys.apply({ code: "KeyW", down: true, repeat: false })).toBe(true);
    expect(keys.apply({ code: "KeyW", down: true, repeat: true })).toBe(false);
    expect(keys.apply({ code: "KeyW", down: true, repeat: false })).toBe(false);
    expect(keys.apply({ code: "KeyW", down: false, repeat: false })).toBe(true);
    expect(keys.apply({ code: "KeyW", down: false, repeat: false })).toBe(false);
  });

  it("drops a key up whose key down it never saw", () => {
    expect(new KeyState().apply({ code: "Space", down: false, repeat: false })).toBe(false);
  });

  it("hands back every held key on a release", () => {
    const keys = new KeyState();
    keys.apply({ code: "KeyA", down: true, repeat: false });
    keys.apply({ code: "Space", down: true, repeat: false });
    expect(keys.releaseAll().sort()).toEqual(["KeyA", "Space"]);
    expect(keys.has("KeyA")).toBe(false);
  });

  it("leaves shortcuts and focus keys to the browser", () => {
    const plain = { ctrlKey: false, metaKey: false, altKey: false };
    expect(isSystemKey({ ...plain, code: "KeyW" })).toBe(false);
    expect(isSystemKey({ ...plain, code: "KeyR", ctrlKey: true })).toBe(true);
    expect(isSystemKey({ ...plain, code: "Tab" })).toBe(true);
    expect(isSystemKey({ ...plain, code: "F5" })).toBe(true);
  });
});

describe("mouse aim", () => {
  it("maps the box to -1 to 1 with y up", () => {
    const box = { left: 0, top: 0, width: 200, height: 100 };
    expect(toStagePoint(100, 50, box)).toEqual({ x: 0, y: 0 });
    expect(toStagePoint(0, 0, box)).toEqual({ x: -1, y: 1 });
    expect(toStagePoint(400, 200, box)).toEqual({ x: 1, y: -1 });
  });

  it("thins moves to the phone's rate and sends the last on a tick", () => {
    let time = 0;
    const sent: number[] = [];
    const aim = new MouseAim({ aim: (p) => sent.push(p.x) }, () => time);
    aim.pointer({ type: "move", x: 0.1, y: 0, button: 0 });
    time += 5;
    aim.pointer({ type: "move", x: 0.2, y: 0, button: 0 });
    expect(sent).toEqual([0.1]);
    time += 20;
    aim.tick();
    expect(sent).toEqual([0.1, 0.2]);
    aim.tick();
    expect(sent).toHaveLength(2);
  });

  it("repeats a still point from the tick, as a phone keeps streaming", () => {
    const sent: number[] = [];
    let time = 0;
    const aim = new MouseAim({ aim: (p) => sent.push(p.x) }, () => time);
    aim.tick();
    expect(sent).toEqual([]);
    aim.pointer({ type: "move", x: 0.3, y: 0, button: 0 });
    time += 100;
    aim.tick();
    expect(sent).toEqual([0.3]);
    time += 200;
    aim.tick();
    expect(sent).toEqual([0.3, 0.3]);
  });

  it("fires buttons with the point at that instant", () => {
    const shots: string[] = [];
    const aim = new MouseAim({ button: (b, down, p) => shots.push(`${b} ${down} ${p.x}`) });
    aim.pointer({ type: "down", x: 0.5, y: 0, button: 0 });
    aim.pointer({ type: "up", x: 0.5, y: 0, button: 0 });
    expect(shots).toEqual(["0 true 0.5", "0 false 0.5"]);
    expect(aim.point).toEqual({ x: 0.5, y: 0 });
  });
});
