"use client";
import { playerColor } from "@/games/kit/players";
import { SplitFinish } from "@/games/kit/split/SplitFinish";
import { nameOf } from "../names";
import { useCubeStore, type HudPlayer } from "../store";
import { Confetti } from "./Confetti";

interface PaneFinishProps {
  slot: number;
  hud: readonly HudPlayer[];
}

/**
 * The finish in one player's pane. Alone it is the level complete. In a
 * race each pane shows the shared finish card with that player's place,
 * so both can read the outcome from their own half, and only a winner
 * gets the confetti.
 */
export function PaneFinish({ slot, hud }: PaneFinishProps) {
  const names = useCubeStore((s) => s.names);
  const me = hud[slot - 1];
  if (!me || (me.status !== "done" && me.status !== "beaten")) return null;
  if (hud.length === 1) {
    return (
      <>
        <p className="cg-finish">Level complete</p>
        <Confetti />
      </>
    );
  }
  // A dead heat is two firsts, so both get the confetti.
  const won = me.status === "done" && me.place === 1;
  return (
    <>
      <SplitFinish name={nameOf(names, slot)} place={me.place} color={playerColor(slot)} />
      {won && <Confetti />}
    </>
  );
}
