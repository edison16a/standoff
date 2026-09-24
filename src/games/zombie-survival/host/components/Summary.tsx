"use client";
import { objectiveFor } from "../../engine/radio";
import { useSurvivalStore } from "../host-store";
import { StatsTable } from "./StatsTable";

/** The checkpoint card: stage cleared, health found, how everyone is doing, and where next. */
export function Summary() {
  const hud = useSurvivalStore((s) => s.hud);
  const next = Math.min(25, hud.stage + 1);
  return (
    <section className="zs-card zs-card--summary" aria-label="Checkpoint">
      <header>
        <span className="zs-card__kicker">Checkpoint {hud.stage} of 25</span>
        <h2>{hud.stageTitle} cleared</h2>
        {hud.healed > 0 && <p className="zs-heal">Supplies found. Team health up {hud.healed}.</p>}
      </header>
      <StatsTable lines={hud.lines} seats={hud.seats} />
      <p className="zs-card__next">{hud.stage === 25 ? "The ship is right there." : `Next: ${objectiveFor(next)}`}</p>
    </section>
  );
}
