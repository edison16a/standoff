"use client";
import { useEffect } from "react";
import { Results } from "../host/components/Results";
import { SessionContext } from "../host/components/session-context";
import type { CubeSession } from "../host/session";
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

/**
 * The results as they end a round, with sample players, for looking the
 * celebration over in development: `?finish=solo`, `race`, `tie` or
 * `early` on the showcase page. Its buttons do nothing.
 */
export function FinishPreview({ sample }: { sample: FinishSample }) {
  useEffect(() => {
    const { rows, winner } = SAMPLES[sample];
    useCubeStore.setState({ phase: "results", results: rows, winner, levelId: "cloud-hopper", practice: false, names: ["Edison", "Maya"] });
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
