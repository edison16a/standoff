import type { CSSProperties } from "react";
import { CharacterBadge } from "@/games/blade-clash/components/CharacterBadge";
import { otherSlot, type Slot } from "@/games/blade-clash/players";
import { playerColor } from "@/games/kit/players";
import { useBladeStore } from "../host-store";
import { useSession } from "./session-context";

/** One fighter's line in the result: emblem, name and points. */
function Line({ slot, won }: { slot: Slot; won: boolean }) {
  const name = useBladeStore((state) => state.names[slot]);
  const pick = useBladeStore((state) => state.seats[slot].pick);
  const points = useBladeStore((state) => state.hud?.score[slot] ?? 0);
  return (
    <li className={`over__line ${won ? "over__line--won" : ""}`} style={{ "--lamp": playerColor(slot) } as CSSProperties}>
      {pick && <CharacterBadge characterId={pick} trim={playerColor(slot)} className="over__badge" />}
      <span className="over__name">{name}</span>
      <b className="over__points">{points}</b>
    </li>
  );
}

/**
 * The end, in the corner under the ceremony: both fighters and their
 * points, the rematch votes from the phones, and a way back to the menu.
 * It fades in once the champion's name has landed.
 */
export function MatchOver() {
  const session = useSession();
  const hud = useBladeStore((state) => state.hud);
  if (!hud || hud.phase !== "matchOver" || !hud.winner) return null;
  const loser = otherSlot(hud.winner);
  return (
    <div className="over" role="dialog" aria-label="Match over">
      <span className="over__title">Final score</span>
      <ol className="over__table">
        <Line slot={hud.winner} won />
        <Line slot={loser} won={false} />
      </ol>
      <div className="over__foot">
        <span className="over__votes" aria-label="Rematch votes">
          Rematch
          <span className={`dot ${hud.rematchVotes[1] ? "dot--on" : ""}`} />
          <span className={`dot ${hud.rematchVotes[2] ? "dot--on" : ""}`} />
        </span>
        <button type="button" className="btn" onClick={() => session.backToLobby()}>
          Menu
        </button>
      </div>
    </div>
  );
}
