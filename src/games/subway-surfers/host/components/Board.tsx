"use client";
import { LeaderboardList } from "@/games/kit/leaderboard";
import { useSurfStore } from "../store";

/** This computer's leaderboard in the game's cartoon look, with the run just played lit up. */
export function Board({ highlight = null }: { highlight?: string | null }) {
  const entries = useSurfStore((s) => s.board);
  return <LeaderboardList className="ss-board" title="Leaderboard" entries={entries} highlight={highlight} empty="No runs yet. Be the first!" />;
}
