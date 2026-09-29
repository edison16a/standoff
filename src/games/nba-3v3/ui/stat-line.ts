/** A number with its word, plural unless it is one: "1 block", "2 blocks". */
export function count(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

interface Line {
  points: number;
  rebounds: number;
  assists: number;
  steals?: number;
  blocks?: number;
}

/** A player's game in words, like "14 points, 5 rebounds, 3 assists, 1 steal, 1 block". */
export function statLine(r: Line): string {
  const parts = [count(r.points, "point"), count(r.rebounds, "rebound"), count(r.assists, "assist")];
  if (r.steals !== undefined) parts.push(count(r.steals, "steal"));
  if (r.blocks !== undefined) parts.push(count(r.blocks, "block"));
  return parts.join(", ");
}
