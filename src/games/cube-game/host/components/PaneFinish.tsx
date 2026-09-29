"use client";
import { placeName } from "../race";
import type { HudPlayer } from "../store";
import { Confetti } from "./Confetti";

interface PaneFinishProps {
  slot: number;
  hud: readonly HudPlayer[];
}

/**
 * The finish in one player's pane. Alone it is the level complete. In a
 * race each pane says its own place, so both players can read the outcome
 * from their own half, and only the winner gets the confetti.
 */
export function PaneFinish({ slot, hud }: PaneFinishProps) {
  const me = hud[slot - 1];
  if (!me || (me.status !== "done" && me.status !== "beaten")) return null;
  if (hud.length === 1) return <FinishText text="Level complete" confetti />;
  const tie = me.status === "done" && hud.filter((p) => p.status === "done" && p.place === 1).length > 1;
  if (tie) return <FinishText text="Dead heat" note="You crossed together" confetti />;
  if (me.status === "done" && me.place === 1) return <FinishText text="You win" note={`${placeName(1)} over the line`} confetti />;
  const winner = hud.findIndex((p) => p.status === "done" && p.place === 1) + 1;
  return <FinishText text={placeName(me.place)} note={winner ? `Player ${winner} got there first` : undefined} lost />;
}

function FinishText({ text, note, confetti, lost }: { text: string; note?: string; confetti?: boolean; lost?: boolean }) {
  return (
    <>
      <div className={`cg-finish${lost ? " cg-finish--lost" : ""}`}>
        <p className="cg-finish__text">{text}</p>
        {note && <p className="cg-finish__note">{note}</p>}
      </div>
      {confetti && <Confetti />}
    </>
  );
}
