"use client";
import { useEffect } from "react";
import type { BrawlHost } from "@/games/brawl-battle/host/brawl-host";
import { Results } from "@/games/brawl-battle/host/components/Results";
import { SessionContext } from "@/games/brawl-battle/host/components/session-context";
import { useBrawlStore, type FighterCard } from "@/games/brawl-battle/host/host-store";
import { CHARACTER_IDS, type CharacterId } from "@/games/brawl-battle/roster";
import "@/games/brawl-battle/styles/results.css";

const card = (id: number, name: string, character: CharacterId, colour: string, place: number, kos: number): FighterCard => ({
  id,
  name,
  character,
  colour,
  bot: name === "Computer",
  away: false,
  percent: 0,
  stocks: place === 1 ? 2 : 0,
  ult: 0,
  out: place !== 1,
  place,
  kos,
  falls: place === 1 ? 1 : 3,
  damage: 120 * kos + 40,
  hits: 0,
});

/** A stand in session: the buttons only need something to call. */
const session = { backToLobby() {}, start() {} } as unknown as BrawlHost;

/**
 * Brawl Battle's real results screen over sample standings, without a
 * match. `who` picks the winner's fighter. Development only.
 */
export function BrawlResults({ who }: { who: string }) {
  const character = CHARACTER_IDS.find((id) => id === who) ?? "samurai";
  const ready = useBrawlStore((state) => state.winner !== null);
  useEffect(() => {
    useBrawlStore.setState({
      canStart: true,
      winner: 0,
      fighters: [
        card(0, "Edison", character, "#ef4444", 1, 3),
        card(1, "Maya", "karate", "#22c55e", 2, 1),
        card(2, "Computer", "bear", "#3b82f6", 3, 0),
        card(3, "Leo", "mage", "#f59e0b", 4, 0),
      ],
    });
  }, [character]);
  if (!ready) return null;
  return (
    <SessionContext.Provider value={session}>
      <div style={{ position: "fixed", inset: 0, background: "#000" }}>
        <Results />
      </div>
    </SessionContext.Provider>
  );
}
