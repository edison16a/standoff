"use client";
import { useState, type CSSProperties } from "react";
import { FinishOrder, finishText, ordinal } from "./finish";
import "./split-finish.css";

interface SplitFinishProps {
  name: string;
  place: number;
  /** The player's colour, for the glow round the card. */
  color?: string;
}

/**
 * The card a player sees in their own pane once they cross the line, such
 * as "Edison Law got 1st place!", while the other panes keep racing. Put
 * it inside the pane's positioned box; it centres itself there.
 */
export function SplitFinish({ name, place, color = "#ffd21f" }: SplitFinishProps) {
  const style = { "--finish": color } as CSSProperties;
  return (
    <div className="split-finish" style={style} role="status">
      <span className="split-finish__place">{ordinal(place)}</span>
      <span className="split-finish__text">{finishText(name, place)}</span>
    </div>
  );
}

/**
 * Places for a HUD that only knows who has finished, in the order they
 * did. Returns null for anyone still racing.
 */
export function useFinishPlaces(finished: readonly boolean[]): (number | null)[] {
  // One tracker per HUD. Its update is idempotent, so a repeated render is safe.
  const [order] = useState(() => new FinishOrder());
  return order.update(finished);
}
