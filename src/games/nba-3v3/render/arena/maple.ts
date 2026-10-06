import { seeded, type Rng } from "../../engine/rng";

/** Pixels across one board: about 5.9 cm at the floor's detail scale, a real 2.25 inch maple strip. */
export const BOARD_PX = 16;

/** A small table of smooth random values, read with wrap round. */
function noise1(rng: Rng, size = 256): (t: number) => number {
  const table = Array.from({ length: size }, () => rng());
  return (t) => {
    const i = Math.floor(t);
    const f = t - i;
    const a = table[((i % size) + size) % size]!;
    const b = table[(((i + 1) % size) + size) % size]!;
    return a + (b - a) * f * f * (3 - 2 * f);
  };
}

/** Where each board in a column ends, cyclic over the tile's length so the tile repeats without a seam. */
function boardEnds(rng: Rng, length: number, minLen: number, maxLen: number): number[] {
  const ends: number[] = [];
  let at = rng() * maxLen;
  while (at < length - minLen * 0.8) {
    ends.push(Math.floor(at));
    at += minLen + rng() * (maxLen - minLen);
  }
  return ends.length ? ends : [0];
}

/**
 * A tile of maple strip flooring, `width` by `height` pixels, boards
 * running along the height. Red, green and blue are the wood's tint
 * about 0.5 (the floor shader doubles them): each board its own shade,
 * a fine grain drifting along it, the odd dark mineral streak. Alpha is
 * the height: the lacquered face high and even, the joints between
 * boards and at their butt ends sunk, with a slight bevel either side.
 * It tiles in both directions.
 */
export function mapleBoards(width: number, height: number, seed = 11): Uint8Array {
  const rng = seeded(seed);
  const cols = Math.ceil(width / BOARD_PX);
  const columns = Array.from({ length: cols }, () => {
    const ends = boardEnds(rng, height, height * 0.09, height * 0.32);
    const boards = ends.map(() => ({ tone: 0.86 + rng() * 0.24, warm: rng() * 2 - 1, grain: rng() * 200, streak: rng() < 0.12 ? 2 + rng() * 12 : -99 }));
    return { ends, boards };
  });
  const grain = noise1(rng);
  const fibre = noise1(rng, 1024);
  const data = new Uint8Array(width * height * 4);
  const cursor = new Int32Array(cols);
  for (let y = 0; y < height; y++) {
    const drift = Math.sin((y / height) * Math.PI * 2 * 3) * 1.6 + Math.sin((y / height) * Math.PI * 2 * 7 + 1.3) * 0.7;
    for (let c = 0; c < cols; c++) {
      const col = columns[c]!;
      while (cursor[c]! < col.ends.length && y >= col.ends[cursor[c]!]!) cursor[c]!++;
      // The board before the first joint is the same one that runs past the last, so the tile wraps cleanly.
      const index = cursor[c]! === 0 ? col.boards.length - 1 : cursor[c]! - 1;
      const board = col.boards[index]!;
      const atEnd = col.ends.includes(y) || col.ends.includes(y - 1);
      for (let k = 0; k < BOARD_PX; k++) {
        const x = c * BOARD_PX + k;
        if (x >= width) break;
        // Fine streaks along the board, wandering a little across it.
        const g = grain(k * 0.45 + board.grain + drift) - 0.5;
        const f = fibre(y * 0.35 + x * 37.7) - 0.5;
        let tone = board.tone * (1 + g * 0.13 + f * 0.035);
        if (Math.abs(k - board.streak) < 1.5) tone *= 0.84;
        let h = 0.97 + g * 0.03;
        if (k === 0) {
          tone *= 0.62;
          h = 0.35;
        } else if (k === 1 || k === BOARD_PX - 1) h = 0.86;
        if (atEnd) {
          tone *= 0.7;
          h = Math.min(h, 0.45);
        }
        const o = (y * width + x) * 4;
        data[o] = Math.min(255, Math.round(128 * tone * (1 + board.warm * 0.035)));
        data[o + 1] = Math.min(255, Math.round(128 * tone));
        data[o + 2] = Math.min(255, Math.round(128 * tone * (1 - board.warm * 0.06)));
        data[o + 3] = Math.round(255 * h);
      }
    }
  }
  return data;
}
