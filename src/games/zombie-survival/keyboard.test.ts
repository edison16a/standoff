import { afterEach, describe, expect, it, vi } from "vitest";
import type { Payload } from "@/platform/protocol";
import { survivalPlayer } from "./keyboard";

/** A fake seat 1, with the host's last state and gun messages to play back. */
function seat(phase: string, weapon = "rifle", playing = true) {
  const sent: Payload[] = [];
  const host: Record<string, Payload> = {
    state: { kind: "state", phase, seats: [{ name: "Keyboard", playing }] },
    gun: { kind: "gun", weapon },
  };
  const ctx = { seat: 1, send: (p: Payload) => sent.push(p), sendLossy: (p: Payload) => sent.push(p), last: (kind?: string) => host[kind ?? "state"] ?? null };
  const player = survivalPlayer(ctx, () => Date.now());
  const fired = () => sent.filter((p) => p.kind === "aim-fire").length;
  return { sent, host, player, fired };
}

describe("Zombie Survival keyboard", () => {
  afterEach(() => vi.useRealTimers());

  it("fires once per click with a pump action gun", () => {
    vi.useFakeTimers();
    const { player, fired, sent } = seat("fight", "shotgun");
    player.pointer!({ type: "move", x: 0.4, y: 0.1, button: 0 });
    player.pointer!({ type: "down", x: 0.4, y: 0.1, button: 0 });
    vi.advanceTimersByTime(2000);
    expect(fired()).toBe(1);
    expect(sent.find((p) => p.kind === "aim-fire")).toEqual({ kind: "aim-fire", x: 0.4, y: 0.1 });
  });

  it("keeps an automatic firing at its rate while Space is held", () => {
    vi.useFakeTimers();
    const { player, fired } = seat("travel", "smg");
    player.key!("Space", true);
    vi.advanceTimersByTime(1000);
    expect(fired()).toBe(14);
    player.key!("Space", false);
    vi.advanceTimersByTime(1000);
    expect(fired()).toBe(14);
  });

  it("lets go of a held trigger when a cutscene starts", () => {
    vi.useFakeTimers();
    const { player, fired, host } = seat("fight", "ak47");
    player.key!("Space", true);
    host.state = { kind: "state", phase: "cutscene", seats: [{ playing: true }] };
    player.tick!();
    const before = fired();
    vi.advanceTimersByTime(1000);
    expect(fired()).toBe(before);
  });

  it("fires on a click after a cutscene even with Space still down from before it", () => {
    vi.useFakeTimers();
    const { player, fired, host } = seat("fight", "shotgun");
    player.key!("Space", true);
    expect(fired()).toBe(1);
    host.state = { kind: "state", phase: "cutscene", seats: [{ playing: true }] };
    player.tick!();
    host.state = { kind: "state", phase: "fight", seats: [{ playing: true }] };
    player.tick!();
    player.pointer!({ type: "down", x: 0, y: 0, button: 0 });
    expect(fired()).toBe(2);
  });

  it("reloads on R and stays quiet outside the run", () => {
    const live = seat("clear");
    live.player.key!("KeyR", true);
    expect(live.sent).toContainEqual({ kind: "reload" });
    const lobby = seat("lobby");
    lobby.player.key!("Space", true);
    lobby.player.key!("KeyR", true);
    lobby.player.pointer!({ type: "move", x: 0, y: 0, button: 0 });
    expect(lobby.sent).toEqual([]);
  });

  it("streams the aim only once this seat is in the run", () => {
    const late = seat("fight", "rifle", false);
    late.player.pointer!({ type: "move", x: 0.2, y: 0.2, button: 0 });
    expect(late.sent).toEqual([]);
    const live = seat("fight");
    live.player.pointer!({ type: "move", x: 0.2, y: 0.2, button: 0 });
    expect(live.sent).toEqual([{ kind: "aim", x: 0.2, y: 0.2 }]);
  });
});
