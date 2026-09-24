"use client";
import { useSurvivalStore } from "../host-store";
import { useSession } from "./session-context";
import { StatsTable } from "./StatsTable";

/** Game over with a Retry, or the escape with the final numbers and Play again. */
export function EndCard() {
  const session = useSession();
  const hud = useSurvivalStore((s) => s.hud);
  const won = hud.phase === "escaped";
  return (
    <section className={`zs-card zs-card--end ${won ? "zs-card--won" : "zs-card--down"}`} aria-label={won ? "You escaped" : "Game over"}>
      <header>
        <span className="zs-card__kicker">{won ? "The Northern Star is out at sea" : `Overrun at stage ${hud.stage}`}</span>
        <h2>{won ? "You escaped the city" : "The team is down"}</h2>
        <p>{won ? "Twenty five stages, one ship, and the whole team aboard." : "Retry from the checkpoint at the start of this stage. Your stats carry on."}</p>
      </header>
      <StatsTable lines={hud.lines} seats={hud.seats} />
      <div className="zs-card__actions">
        {won ? (
          <button type="button" className="btn btn--primary btn--lg" onClick={() => session.backToLobby()}>
            Play again
          </button>
        ) : (
          <>
            <button type="button" className="btn btn--ghost btn--lg" onClick={() => session.backToLobby()}>
              Back to the lobby
            </button>
            <button type="button" className="btn btn--primary btn--lg" onClick={() => session.retry()}>
              Retry from checkpoint
            </button>
          </>
        )}
      </div>
    </section>
  );
}
