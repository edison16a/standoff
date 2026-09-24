"use client";
import { useFruitStore } from "../host-store";

/**
 * The big 3, 2, 1 in the middle of the board, then "Slice!" through the
 * first second of play while the first fruit flies up.
 */
export function Countdown() {
  const phase = useFruitStore((state) => state.hud.phase);
  const count = useFruitStore((state) => state.hud.countdown);
  const secondsLeft = useFruitStore((state) => state.hud.secondsLeft);
  const length = useFruitStore((state) => state.settings.seconds);

  if (phase === "countdown" && count > 0) {
    return (
      <div key={count} className="fn-count" aria-live="assertive">
        {count}
      </div>
    );
  }
  if (phase === "playing" && secondsLeft >= length) {
    return <div className="fn-count fn-count--go">Slice!</div>;
  }
  return null;
}
