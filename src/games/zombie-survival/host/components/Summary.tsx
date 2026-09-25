"use client";
import { STAGE_COUNT } from "../../engine/stages";
import { useSurvivalStore } from "../host-store";
import { StatsTable } from "./StatsTable";

/**
 * The summary card, for the checkpoints the story stops at: the roof and
 * the pier. Stage cleared, health found, how everyone is doing, and what
 * comes next.
 */
export function Summary() {
  const hud = useSurvivalStore((s) => s.hud);
  // The roof card must not give the crash away: as far as anyone knows, the ride is here.
  const after = hud.stage === STAGE_COUNT ? "The ship is right there." : "The chopper is coming in to land.";
  return (
    <section className="zs-card zs-card--summary" aria-label="Checkpoint">
      <header>
        <span className="zs-card__kicker">
          Checkpoint {hud.stage} of {STAGE_COUNT}
        </span>
        <h2>{hud.stageTitle} cleared</h2>
        {hud.healed > 0 && <p className="zs-heal">Supplies found. Team health up {hud.healed}.</p>}
      </header>
      <StatsTable lines={hud.lines} seats={hud.seats} />
      <p className="zs-card__next">{after}</p>
    </section>
  );
}
