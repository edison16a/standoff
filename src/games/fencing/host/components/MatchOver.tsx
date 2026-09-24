import { CHARACTERS } from "@/games/fencing/characters";
import { useHostStore } from "../host-store";
import { useSession } from "../../../../platform/host/components/session-context";

/** The end: who won, the score, rematch votes from the phones, and a way out. */
export function MatchOver() {
  const session = useSession();
  const hud = useHostStore((state) => state.hud);
  const seats = useHostStore((state) => state.seats);
  if (!hud || hud.phase !== "matchOver" || !hud.winner) return null;
  const pick = seats[hud.winner].pick;
  const loser = hud.winner === 1 ? 2 : 1;
  return (
    <div className="over" role="dialog" aria-label="Match over">
      <strong className="over__title">{pick ? CHARACTERS[pick].name : `Player ${hud.winner}`} wins</strong>
      <span className="over__score mono">
        {hud.scores[hud.winner]} : {hud.scores[loser]}
      </span>
      <span className="over__votes" aria-label="Rematch votes">
        <span className={`dot ${hud.rematchVotes[1] ? "dot--on" : ""}`} />
        <span className={`dot ${hud.rematchVotes[2] ? "dot--on" : ""}`} />
      </span>
      <button type="button" className="btn" onClick={() => session.backToLobby()}>
        New fencers
      </button>
    </div>
  );
}
