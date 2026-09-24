import { describe, expect, it } from "vitest";
import { Lobby } from "./lobby";

describe("the lobby", () => {
  it("needs a weapon before ready", () => {
    const lobby = new Lobby();
    expect(lobby.setReady(1, true)).toBe(false);
    lobby.pick(1, "ak47");
    expect(lobby.setReady(1, true)).toBe(true);
    expect(lobby.get(1)).toEqual({ weapon: "ak47", ready: true });
  });

  it("clears ready when the gun changes", () => {
    const lobby = new Lobby();
    lobby.pick(1, "smg");
    lobby.setReady(1, true);
    lobby.pick(1, "rifle");
    expect(lobby.get(1).ready).toBe(false);
  });

  it("starts on its own only when everyone here is ready", () => {
    const lobby = new Lobby();
    lobby.pick(1, "smg");
    lobby.pick(2, "shotgun");
    lobby.setReady(1, true);
    expect(lobby.everyoneReady([1, 2])).toBe(false);
    expect(lobby.readySeats([1, 2])).toEqual([1]);
    lobby.setReady(2, true);
    expect(lobby.everyoneReady([1, 2])).toBe(true);
    expect(lobby.everyoneReady([])).toBe(false);
  });

  it("forgets a seat when someone new takes it", () => {
    const lobby = new Lobby();
    lobby.pick(3, "ak47");
    lobby.setReady(3, true);
    lobby.forget(3);
    expect(lobby.get(3)).toEqual({ weapon: null, ready: false });
    expect(lobby.everyoneReady([3])).toBe(false);
  });
});
