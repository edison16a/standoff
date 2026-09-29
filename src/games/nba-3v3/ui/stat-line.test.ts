import { describe, expect, it } from "vitest";
import { count, statLine } from "./stat-line";

describe("stat line", () => {
  it("says one of a thing without an s", () => {
    expect(count(1, "block")).toBe("1 block");
    expect(count(0, "block")).toBe("0 blocks");
    expect(count(3, "block")).toBe("3 blocks");
  });

  it("reads a whole line", () => {
    expect(statLine({ points: 14, rebounds: 5, assists: 1, steals: 2, blocks: 1 })).toBe("14 points, 5 rebounds, 1 assist, 2 steals, 1 block");
    expect(statLine({ points: 1, rebounds: 0, assists: 3 })).toBe("1 point, 0 rebounds, 3 assists");
  });
});
