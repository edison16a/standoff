import { otherSlot } from "@/games/blade-clash/players";
import { useBladeStore } from "../host-store";
import { useSession } from "./session-context";

/** The end: who won, the final score, rematch votes from the phones, and a way back to the menu. */
export function MatchOver() {
  const session = useSession();
  const hud = useBladeStore((state) => state.hud);
  const names = useBladeStore((state) => state.names);
  if (!hud || hud.phase !== "matchOver" || !hud.winner) return null;
  const loser = otherSlot(hud.winner);
  return (
    <div className="over" role="dialog" aria-label="Match over">
      <strong className="over__title">{names[hud.winner]} wins</strong>
      <span className="over__score">
        {hud.score[hud.winner]} to {hud.score[loser]} against {names[loser]}
      </span>
      <span className="over__votes" aria-label="Rematch votes">
        <span className={`dot ${hud.rematchVotes[1] ? "dot--on" : ""}`} />
        <span className={`dot ${hud.rematchVotes[2] ? "dot--on" : ""}`} />
      </span>
      <button type="button" className="btn" onClick={() => session.backToLobby()}>
        Menu
      </button>
    </div>
  );
}
