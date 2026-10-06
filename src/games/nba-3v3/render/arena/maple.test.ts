import { describe, expect, it } from "vitest";
import { BOARD_PX, mapleBoards } from "./maple";

const W = 128;
const H = 512;
const data = mapleBoards(W, H);
const at = (x: number, y: number, c: number) => data[(y * W + x) * 4 + c]!;

describe("maple boards", () => {
  it("fills every pixel", () => {
    expect(data.length).toBe(W * H * 4);
    for (let i = 3; i < data.length; i += 4) expect(data[i]).toBeGreaterThan(0);
  });

  it("sinks the joint along the edge of every board", () => {
    for (let x = 0; x < W; x += BOARD_PX) {
      for (let y = 0; y < H; y += 37) expect(at(x, y, 3)).toBeLessThan(at(x + BOARD_PX / 2, y, 3));
    }
  });

  it("has butt joints along each board's length", () => {
    // Some row in each column is a joint across the whole board.
    for (let x = 0; x < W; x += BOARD_PX) {
      let joints = 0;
      for (let y = 0; y < H; y++) if (at(x + BOARD_PX / 2, y, 3) < 128) joints++;
      expect(joints).toBeGreaterThan(0);
    }
  });

  it("tiles: the board running off the bottom carries on at the top in the same shade", () => {
    let same = 0;
    for (let x = BOARD_PX / 2; x < W; x += BOARD_PX) if (Math.abs(at(x, 0, 1) - at(x, H - 1, 1)) < 30) same++;
    expect(same).toBeGreaterThan(W / BOARD_PX / 2);
  });

  it("is the same every time, so captures match", () => {
    expect(mapleBoards(32, 64)).toEqual(mapleBoards(32, 64));
  });
});
