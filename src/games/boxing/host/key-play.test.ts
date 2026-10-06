// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { HostRoomApi, HostRoomEvent } from "@/platform/games/game-api";
import type { Payload } from "@/platform/protocol";
import type { MatchEvent } from "../engine/events";
import { ofType } from "../engine/test-helpers";
import { FightDriver } from "./fight-driver";
import { useBoxingStore as store } from "./host-store";
import type { BoxKey } from "./key-boxer";
import { KeyPlay } from "./key-play";

/** Just enough room to hear the Keyboard player's messages. */
function fakeRoom() {
  const listeners = new Set<(event: HostRoomEvent) => void>();
  const room = { on: (listener: (event: HostRoomEvent) => void) => (listeners.add(listener), () => listeners.delete(listener)) } as unknown as HostRoomApi;
  const say = (payload: Payload) => listeners.forEach((listener) => listener({ type: "message", seat: 1, payload }));
  return { room, say };
}

function key(code: string, down: boolean, taken = false): void {
  const event = new KeyboardEvent(down ? "keydown" : "keyup", { code, cancelable: true });
  if (taken) event.preventDefault();
  window.dispatchEvent(event);
}

let play: KeyPlay | null = null;
const initial = store.getState();
beforeEach(() => store.setState(initial, true));
afterEach(() => play?.dispose());

function setup(driver: FightDriver | null = null) {
  const { room, say } = fakeRoom();
  const picks: BoxKey[] = [];
  play = new KeyPlay(room, { driver: () => driver, pick: (key) => picks.push(key) });
  return { play, say, picks };
}

describe("keyboard mode for Boxing", () => {
  it("turns on when the Keyboard player says hello in the menu, as one player", () => {
    store.setState({ players: 2 });
    const { play, say } = setup();
    expect(play.on).toBe(false);
    say({ kind: "keyboard" });
    expect(play.on).toBe(true);
    expect(store.getState().players).toBe(1);
  });

  it("leaves the camera game alone: keys do nothing until keyboard mode is on", () => {
    const { play, say } = setup();
    key("Space", true);
    say({ kind: "box-key", key: "duck", down: true });
    expect(play.boxer.isHeld("guard") || play.boxer.isHeld("duck")).toBe(false);
  });

  it("holds keys from the page and from the Keyboard player alike, each once", () => {
    store.setState({ input: "keys" });
    const { play, say } = setup();
    key("KeyA", true);
    key("ArrowLeft", true);
    key("KeyA", false);
    expect(play.boxer.isHeld("slip-left")).toBe(true);
    key("ArrowLeft", false);
    expect(play.boxer.isHeld("slip-left")).toBe(false);
    key("Space", true, true);
    expect(play.boxer.isHeld("guard")).toBe(false);
    say({ kind: "box-key", key: "guard", down: true });
    expect(play.boxer.isHeld("guard")).toBe(true);
    window.dispatchEvent(new Event("blur"));
    expect(play.boxer.isHeld("guard")).toBe(false);
  });

  it("browses and locks in on the build choice", () => {
    store.setState({ input: "keys", screen: "pick" });
    const { picks } = setup();
    key("KeyD", true);
    key("Space", true);
    expect(picks).toEqual(["slip-right", "guard"]);
  });

  it("punches the computer boxer in a fight, and digs to the body while ducking", () => {
    store.setState({ input: "keys", screen: "fight" });
    const driver = new FightDriver({ seed: 3, slots: [1, null], introMs: 0, touch: false, botLevel: "training" });
    const events: MatchEvent[] = [];
    driver.listen((event) => events.push(event));
    const { play, say } = setup(driver);
    let now = 0;
    const tick = (ms: number) => {
      for (const end = now + ms; now < end; now += 16) {
        play.defend(driver, now);
        driver.tick(now);
      }
    };
    tick(300);
    expect(driver.live).toBe(true);
    say({ kind: "box-key", key: "cross", down: true });
    expect(ofType(events, "throw")[0]).toMatchObject({ fighter: 0, style: "cross", level: "head" });
    tick(1500);
    say({ kind: "box-key", key: "cross", down: false });
    say({ kind: "box-key", key: "duck", down: true });
    say({ kind: "box-key", key: "hook-left", down: true });
    expect(ofType(events, "throw")[1]).toMatchObject({ fighter: 0, style: "hook", level: "body" });
  });
});
