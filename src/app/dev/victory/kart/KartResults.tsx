"use client";
import { useEffect } from "react";
import type { CharacterId } from "@/games/magic-kart/characters";
import type { KartHost } from "@/games/magic-kart/host/kart-host";
import { Results } from "@/games/magic-kart/host/components/Results";
import { SessionContext } from "@/games/magic-kart/host/components/session-context";
import { useKartStore, type StandingRow } from "@/games/magic-kart/host/host-store";
import "@/games/magic-kart/styles/results.css";

const row = (kartId: number, name: string, character: CharacterId, color: string, place: number, time: number | null): StandingRow => ({
  kartId,
  name,
  character,
  color,
  place,
  lap: 2,
  finished: time !== null,
  time,
  computer: name === "Computer",
});

/** A stand in session: the buttons only need something to call. */
const session = { backToLobby() {}, startRace() {} } as unknown as KartHost;

/** Magic Kart's real results over sample standings, without racing. Development only. */
export function KartResults() {
  const ready = useKartStore((state) => state.standings.length > 0);
  useEffect(() => {
    useKartStore.setState({
      mapId: "beach",
      seats: [{ seat: 1, name: "Edison", connected: true, pick: "blaze", ready: true }],
      standings: [
        row(0, "Edison", "blaze", "#ef4444", 1, 83.45),
        row(1, "Maya", "pip", "#22c55e", 2, 85.02),
        row(2, "Computer", "nova", "#3b82f6", 3, 87.8),
        row(3, "Leo", "mochi", "#f59e0b", 4, null),
      ],
    });
  }, []);
  if (!ready) return null;
  return (
    <SessionContext.Provider value={session}>
      <div style={{ position: "fixed", inset: 0, background: "#000" }}>
        <Results />
      </div>
    </SessionContext.Provider>
  );
}
