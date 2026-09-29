import { describe, expect, it } from "vitest";
import type { Player } from "@/platform/games/game-api";
import { nameOf, playerNames } from "./names";

const player = (seat: number, name: string): Player => ({ seat, name, connected: true }) as Player;

describe("player names", () => {
  it("takes each seat's name from the room", () => {
    expect(playerNames([player(2, "Maya"), player(1, "Edison")])).toEqual(["Edison", "Maya"]);
  });

  it("falls back to the seat number for a blank or missing name", () => {
    expect(playerNames([player(1, "  ")])).toEqual(["Player 1", "Player 2"]);
    expect(nameOf([], 2)).toBe("Player 2");
  });
});
