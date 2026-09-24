import { Icon } from "@/components/ui/Icon";
import { CHARACTERS } from "@/shared/characters";
import { useHostStore } from "../../host-store";
import { useSession } from "../session-context";

/** The end card. A rematch starts once both phones vote, no new scan needed. */
export function MatchOver() {
  const session = useSession();
  const hud = useHostStore((state) => state.hud);
  const seats = useHostStore((state) => state.seats);
  if (!hud || hud.phase !== "matchOver" || !hud.winner) return null;

  const pick = seats[hud.winner].pick;
  const votes = Number(hud.rematchVotes[1]) + Number(hud.rematchVotes[2]);
  return (
    <div className="over card" role="dialog" aria-label="Match over">
      <span className="over__icon">
        <Icon name="trophy" size={28} />
      </span>
      <span className="label">Match over</span>
      <h2 className="over__title">Player {hud.winner} wins</h2>
      <p className="muted">
        {pick ? `${CHARACTERS[pick].name} takes it` : "Match decided"} {hud.scores[1]} to {hud.scores[2]}.
      </p>
      <p className="over__votes">
        <span className={`dot ${hud.rematchVotes[1] ? "dot--on" : ""}`} />
        <span className={`dot ${hud.rematchVotes[2] ? "dot--on" : ""}`} />
        {votes} of 2 want a rematch
      </p>
      <div className="over__actions">
        <button type="button" className="btn" onClick={() => session.backToLobby()}>
          Change fencers
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => session.endGame()}>
          End game
        </button>
      </div>
    </div>
  );
}
