import type { TeamId } from "../engine/fighter";

/** A view as fractions of the screen, from the top left, the same shape the kit's SplitMap takes. */
export interface ViewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One view: the fighter it follows over the shoulder, or null for the television camera. */
export interface Pane {
  fighter: number | null;
  rect: ViewRect;
}

export interface Seated {
  id: number;
  team: TeamId;
}

const FULL: ViewRect = { x: 0, y: 0, w: 1, h: 1 };
const HALVES: ViewRect[] = [
  { x: 0, y: 0, w: 0.5, h: 1 },
  { x: 0.5, y: 0, w: 0.5, h: 1 },
];
const COLUMN: Record<TeamId, ViewRect[]> = {
  0: [
    { x: 0, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 0.5, h: 0.5 },
  ],
  1: [
    { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
  ],
};

/**
 * The split screen for the human players, in the order given. Two share
 * the screen side by side; three or four take quarters, with the pink
 * team down the left and the cyan team down the right, so teammates sit
 * together. A quarter left over shows the whole field from the
 * television camera. With nobody playing, the television camera has it all.
 */
export function splitPanes(humans: readonly Seated[]): Pane[] {
  if (humans.length === 0) return [{ fighter: null, rect: FULL }];
  if (humans.length === 1) return [{ fighter: humans[0]!.id, rect: FULL }];
  if (humans.length === 2) {
    // Different teams: pink on the left. The same team: in the order given.
    const [a, b] = humans[0]!.team <= humans[1]!.team ? [humans[0]!, humans[1]!] : [humans[1]!, humans[0]!];
    return [
      { fighter: a.id, rect: HALVES[0]! },
      { fighter: b.id, rect: HALVES[1]! },
    ];
  }
  const panes: Pane[] = [];
  const spare: ViewRect[] = [];
  for (const team of [0, 1] as const) {
    const members = humans.filter((h) => h.team === team);
    COLUMN[team].forEach((rect, i) => {
      const who = members[i];
      if (who) panes.push({ fighter: who.id, rect });
      else spare.push(rect);
    });
    // A team with more humans than its column holds spills into the other column's spare places.
    for (const extra of members.slice(2)) panes.push({ fighter: extra.id, rect: { ...FULL } });
  }
  const loose = panes.filter((p) => p.rect.w === 1);
  for (const p of loose) p.rect = spare.shift() ?? p.rect;
  for (const rect of spare) panes.push({ fighter: null, rect });
  return panes;
}
