"use client";
import type { CSSProperties } from "react";
import { playerColor } from "@/games/kit/players";
import { finishText, ordinal } from "../race";
import { useCubeStore } from "../store";

/**
 * The finish card in a racer's own pane once they cross the line, such
 * as "Player 2 got 1st place!", while the other pane keeps racing. It
 * uses the same words as the kit's split screen finish card.
 */
export function RaceFinish({ slot, place }: { slot: number; place: number }) {
  const style = { "--finish": playerColor(slot) } as CSSProperties;
  return (
    <div className={`cg-race-finish${place === 1 ? " cg-race-finish--won" : ""}`} style={style} role="status">
      <span className="cg-race-finish__place">{ordinal(place)}</span>
      <span className="cg-race-finish__text">{finishText(`Player ${slot}`, place)}</span>
    </div>
  );
}

/**
 * In the pane of a racer still going once someone has won: who won and
 * the seconds left to finish for a place. Hidden while the results show.
 */
export function RaceClock({ slot }: { slot: number }) {
  const grace = useCubeStore((s) => s.grace);
  const winner = useCubeStore((s) => s.hud.findIndex((p, i) => i !== slot - 1 && p.place === 1));
  const results = useCubeStore((s) => s.phase === "results");
  if (grace === null || winner < 0 || results) return null;
  return (
    <p className="cg-race-clock" role="status">
      <span className="cg-dot" style={{ background: playerColor(winner + 1) }} aria-hidden="true" />
      {grace > 0 ? `Player ${winner + 1} won. ${grace} seconds left to finish` : "Time is up"}
    </p>
  );
}
