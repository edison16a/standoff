import { describe, expect, it } from "vitest";
import { playerColor } from "@/games/kit/players";
import { buildLineup } from "./lineup";

describe("the lineup", () => {
  const entries = [
    { team: 0 as const, seat: 2, gun: "sniper" as const },
    { team: 0 as const, seat: null, gun: null },
    { team: 1 as const, seat: null, gun: null },
    { team: 1 as const, seat: 4, gun: "shotgun" as const },
  ];

  it("deals every fighter a different character, and keeps each player's name, gun and colour", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { setups, colours } = buildLineup(entries, (seat) => `P${seat}`, "hard", seed);
      expect(new Set(setups.map((s) => s.character)).size).toBe(4);
      expect(setups[0]).toMatchObject({ team: 0, seat: 2, name: "P2", gun: "sniper" });
      expect(setups[3]).toMatchObject({ team: 1, seat: 4, name: "P4", gun: "shotgun" });
      expect(colours[0]).toBe(playerColor(2));
      expect(new Set(colours).size).toBe(4);
    }
  });

  it("gives computer players a gun their side lacks, a call sign and the skill asked for", () => {
    for (const seed of [11, 12, 13, 14]) {
      const { setups } = buildLineup(entries, (seat) => `P${seat}`, "easy", seed);
      expect(setups[1]!.gun).not.toBe("sniper");
      expect(setups[2]!.gun).not.toBe("shotgun");
      expect(setups[1]!.difficulty).toBe("easy");
      expect(setups[1]!.name).not.toBe(setups[2]!.name);
      expect(setups[1]!.seat).toBeNull();
    }
  });
});
