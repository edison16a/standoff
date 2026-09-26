import { describe, expect, it } from "vitest";
import type { Player } from "@/platform/games/game-api";
import { phoneStateSchema, type PhoneState } from "../protocol";
import { useCounterStore } from "./host-store";
import { buildLineup } from "./lineup";
import { Lobby } from "./lobby";
import { MatchDriver } from "./match-driver";
import type { PhoneLink } from "./phone-link";
import { publish } from "./publish";

const players: Player[] = [
  { seat: 1, name: "Ana", connected: true },
  { seat: 2, name: "Ben", connected: true },
  { seat: 3, name: "Cy", connected: true },
];

function run(lobby: Lobby, driver: MatchDriver | null): Map<number, PhoneState> {
  const sent = new Map<number, PhoneState>();
  const phones = { sendState: (seat: number, state: PhoneState) => sent.set(seat, state) } as unknown as PhoneLink;
  publish({ nowMs: 0, players, lobby, driver, phones });
  return sent;
}

function readyLobby(): Lobby {
  const lobby = new Lobby();
  for (const p of players) {
    lobby.connect(p.seat);
    lobby.setGun(p.seat, "smg");
    lobby.setReady(p.seat, true);
  }
  return lobby;
}

describe("what the screens are told", () => {
  it("tells each phone in the lobby its view, and a benched phone the whole screen", () => {
    const sent = run(readyLobby(), null);
    expect(sent.get(1)!.zone).toEqual({ x: 0, y: 0, w: 0.5, h: 1 });
    expect(sent.get(2)!.zone).toEqual({ x: 0.5, y: 0, w: 0.5, h: 1 });
    expect(sent.get(3)!.zone).toBeNull();
    expect(sent.get(3)!.team).toBeNull();
    for (const state of sent.values()) expect(phoneStateSchema.safeParse(state).success).toBe(true);
    expect(useCounterStore.getState().spots.map((s) => s.name)).toEqual(["Ana", "Ben"]);
    expect(useCounterStore.getState().bench).toEqual(["Cy"]);
  });

  it("gives players in a match their own side's score first, and never a round past ten", () => {
    const lobby = readyLobby();
    const d = new MatchDriver(buildLineup(lobby.entries(), (s) => players[s - 1]!.name, "normal", 3), 3);
    const m = d.battle.match;
    m.score = [1, 3];
    // Draws can run a match long; the phones' count stops at ten.
    m.round = 14;
    const sent = run(lobby, d);
    expect(sent.get(1)!.score).toEqual([1, 3]);
    expect(sent.get(2)!.score).toEqual([3, 1]);
    expect(sent.get(1)!.round).toBe(10);
    expect(sent.get(1)!.playing).toBe(true);
    // A phone waiting out the match aims at the whole screen and is not playing.
    expect(sent.get(3)!.playing).toBe(false);
    expect(sent.get(3)!.zone).toBeNull();
    for (const state of sent.values()) expect(phoneStateSchema.safeParse(state).success).toBe(true);
    expect(useCounterStore.getState().panes.map((p) => p.name)).toEqual(["Ana", "Ben"]);
    expect(useCounterStore.getState().waiting).toEqual(["Cy"]);
  });
});
