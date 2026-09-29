"use client";
import { useEffect } from "react";
import { playerColor } from "@/games/kit/players";
import type { CounterHost } from "../host/counter-host";
import { Results } from "../host/components/Results";
import { SessionContext } from "../host/components/session-context";
import { useCounterStore, type ResultRow } from "../host/host-store";

const SAMPLE: ResultRow[] = [
  { id: 0, team: 0, name: "Edison", colour: playerColor(1), bot: false, character: "pro", gun: "rifle", kills: 9, deaths: 3, headshots: 4, damage: 1180 },
  { id: 1, team: 0, name: "Maya", colour: playerColor(3), bot: false, character: "runner", gun: "shotgun", kills: 6, deaths: 4, headshots: 1, damage: 870 },
  { id: 2, team: 1, name: "Kite", colour: playerColor(2), bot: true, character: "operator", gun: "sniper", kills: 5, deaths: 7, headshots: 3, damage: 640 },
  { id: 3, team: 1, name: "Vex", colour: playerColor(4), bot: true, character: "heavy", gun: "smg", kills: 2, deaths: 8, headshots: 0, damage: 410 },
];

/**
 * The results as they end a match, with sample players, for looking the
 * winners' scene over in development: `?winners=1` for a 1 v 1 and
 * `?winners=2` for a 2 v 2 on the showcase page. Its buttons do nothing.
 */
export function WinnersPreview({ count }: { count: 1 | 2 }) {
  useEffect(() => {
    const rows = count === 2 ? SAMPLE : [SAMPLE[0]!, SAMPLE[2]!];
    useCounterStore.setState({ results: rows, winner: 0, score: [5, 3], canStart: true });
  }, [count]);
  const idle = { backToLobby: () => undefined, start: () => undefined } as unknown as CounterHost;
  return (
    <SessionContext.Provider value={idle}>
      <Results />
    </SessionContext.Provider>
  );
}
