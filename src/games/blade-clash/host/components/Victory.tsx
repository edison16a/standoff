"use client";
import { CHARACTERS } from "@/games/blade-clash/characters";
import { otherSlot } from "@/games/blade-clash/players";
import { playerColor } from "@/games/kit/players";
import { VictoryOverlay } from "@/games/kit/victory/ui/VictoryOverlay";
import { useBladeStore } from "../host-store";
import { MatchOver } from "./MatchOver";

/**
 * The winner's ceremony over the dais: the champion's name dropping in
 * big across the top with their fighter and the score under it, and once
 * it has landed the result in the bottom right corner, with the rematch
 * votes and the way back to the menu.
 */
export function Victory() {
  const hud = useBladeStore((state) => state.hud);
  const names = useBladeStore((state) => state.names);
  const seats = useBladeStore((state) => state.seats);
  if (!hud || hud.phase !== "matchOver" || !hud.winner) return null;
  const winner = hud.winner;
  const pick = seats[winner].pick;
  const score = `Wins ${hud.score[winner]} to ${hud.score[otherSlot(winner)]}.`;
  return (
    <div className="victory">
      <VictoryOverlay eyebrow="Champion" names={[{ name: names[winner], colour: playerColor(winner) }]} subtitle={pick ? `${CHARACTERS[pick].name}. ${score}` : score} />
      <MatchOver />
    </div>
  );
}
