import { describe, expect, it } from "vitest";
import { clearBoards, memoryBoards } from "@/games/kit/leaderboard";
import { formatTime, rankLine, readLevelBoard, recordFinish, triesTag } from "./level-board";

const finish = (seconds: number, attempts = 1, slot = 1) => ({ slot, name: `Player ${slot}`, seconds, attempts });

describe("a level's leaderboard", () => {
  it("ranks finishes quickest first and says where each landed", () => {
    const storage = memoryBoards();
    expect(recordFinish("first-light", finish(60), storage).place).toMatchObject({ rank: 1, total: 1, best: true });
    expect(recordFinish("first-light", finish(90, 3), storage).place).toMatchObject({ rank: 2, total: 2, best: false });
    const quick = recordFinish("first-light", finish(55), storage);
    expect(quick.place).toMatchObject({ rank: 1, total: 3, best: true });
    expect(quick.entries.map((e) => e.value)).toEqual([55, 60, 90]);
    expect(quick.entries[2]!.tag).toBe("3 tries");
  });

  it("marks a run the admin autopilot flew", () => {
    const storage = memoryBoards();
    expect(recordFinish("first-light", { ...finish(60), pilot: true }, storage).entries[0]!.tag).toBe("Autopilot");
  });

  it("keeps each level apart", () => {
    const storage = memoryBoards();
    recordFinish("first-light", finish(60), storage);
    recordFinish("core-meltdown", finish(70), storage);
    expect(readLevelBoard("first-light", storage)).toHaveLength(1);
    expect(readLevelBoard("core-meltdown", storage)).toHaveLength(1);
  });

  it("is wiped by Clear leaderboards along with every other game's", () => {
    const storage = memoryBoards();
    recordFinish("first-light", finish(60), storage);
    clearBoards(undefined, storage);
    expect(readLevelBoard("first-light", storage)).toEqual([]);
  });

  it("words times, tries and ranks plainly", () => {
    expect(formatTime(48.34)).toBe("48.3 s");
    expect(formatTime(62.44)).toBe("1:02.4");
    expect(formatTime(59.97)).toBe("1:00.0");
    expect(triesTag(1)).toBe("1st try");
    expect(triesTag(4)).toBe("4 tries");
    expect(rankLine({ slot: 1, rank: 3, total: 9, best: false, id: "x" })).toBe("#3 on this computer");
  });
});
