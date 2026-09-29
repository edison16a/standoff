"use client";
import { useEffect } from "react";
import { Results } from "../host/components/Results";
import { SessionContext } from "../host/components/session-context";
import type { CubeSession } from "../host/session";
import type { LeaderEntry } from "@/games/kit/leaderboard";
import type { BoardPlace } from "../host/level-board";
import { useCubeStore, type ResultRow } from "../host/store";

export type FinishSample = "solo" | "race" | "tie" | "early";

const SAMPLES: Record<FinishSample, { rows: ResultRow[]; winner: number | null }> = {
  solo: { rows: [{ slot: 1, finished: true, best: 100, attempts: 7, jumps: 64, place: 1 }], winner: null },
  race: {
    rows: [
      { slot: 1, finished: false, best: 82, attempts: 5, jumps: 71, place: 2 },
      { slot: 2, finished: true, best: 100, attempts: 3, jumps: 88, place: 1 },
    ],
    winner: 2,
  },
  tie: {
    rows: [
      { slot: 1, finished: true, best: 100, attempts: 2, jumps: 90, place: 1 },
      { slot: 2, finished: true, best: 100, attempts: 4, jumps: 90, place: 1 },
    ],
    winner: null,
  },
  early: {
    rows: [
      { slot: 1, finished: false, best: 64, attempts: 9, jumps: 40, place: 1 },
      { slot: 2, finished: false, best: 31, attempts: 12, jumps: 33, place: 2 },
    ],
    winner: null,
  },
};

/** A sample board, with each finisher of the sample slotted in from third. */
function sampleBoard(rows: readonly ResultRow[], names: readonly string[]): { board: LeaderEntry[]; placed: BoardPlace[] } {
  const others = ["Ava", "Leo", "Kai", "Zoe", "Sam", "Ivy"].map((name, i) => ({ id: `s${i}`, name, value: 54 + i * 9.3, at: i, tag: `${i + 2} tries` }));
  const finishers = rows.filter((row) => row.finished);
  const mine = finishers.map((row, i) => ({ id: `me${row.slot}`, name: names[row.slot - 1]!, value: 58 + i, at: 10 + i, tag: `${row.attempts} tries` }));
  const board = [...others.slice(0, 2), ...mine, ...others.slice(2)];
  const placed = finishers.map((row, i) => ({ slot: row.slot, rank: 3 + i, total: board.length, best: false, id: `me${row.slot}` }));
  return { board, placed };
}

/**
 * The results as they end a round, with sample players, for looking the
 * celebration over in development: `?finish=solo`, `race`, `tie` or
 * `early` on the showcase page. Its buttons do nothing.
 */
export function FinishPreview({ sample }: { sample: FinishSample }) {
  useEffect(() => {
    const { rows, winner } = SAMPLES[sample];
    const names = ["Edison", "Maya"];
    useCubeStore.setState({ phase: "results", results: rows, winner, levelId: "cloud-hopper", practice: false, names, ...sampleBoard(rows, names) });
  }, [sample]);
  const idle = { toMenu: () => undefined, retry: () => undefined, next: () => undefined } as unknown as CubeSession;
  return (
    <div className="cg-stage">
      <SessionContext.Provider value={idle}>
        <Results />
      </SessionContext.Provider>
    </div>
  );
}
