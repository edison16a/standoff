"use client";
import { objectiveFor } from "../../engine/radio";
import { CHOPPER_STAGE, STAGE_COUNT } from "../../engine/stages";
import { useSurvivalStore } from "../host-store";
import { StatsTable } from "./StatsTable";

/** The checkpoint card: stage cleared, health found, how everyone is doing, and where next. */
export function Summary() {
  const hud = useSurvivalStore((s) => s.hud);
  const next = Math.min(STAGE_COUNT, hud.stage + 1);
  // The roof card must not give the crash away: as far as anyone knows, the ride is here.
  const after = hud.stage === STAGE_COUNT ? "The ship is right there." : hud.stage === CHOPPER_STAGE ? "The chopper is coming in to land." : `Next: ${objectiveFor(next)}`;
  return (
    <section className="zs-card zs-card--summary" aria-label="Checkpoint">
      <header>
        <span className="zs-card__kicker">Checkpoint {hud.stage} of {STAGE_COUNT}</span>
        <h2>{hud.stageTitle} cleared</h2>
        {hud.healed > 0 && <p className="zs-heal">Supplies found. Team health up {hud.healed}.</p>}
      </header>
      <StatsTable lines={hud.lines} seats={hud.seats} />
      <p className="zs-card__next">{after}</p>
    </section>
  );
}
