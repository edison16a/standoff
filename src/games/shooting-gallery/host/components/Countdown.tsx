"use client";
import { useHud } from "./session-context";

/** The big "3, 2, 1" in the middle of the booth, then "Shoot" for the first second of play. */
export function Countdown() {
  const game = useHud((state) => state.game);
  let word: string | null = null;
  if (game.phase === "countdown" && game.countdown > 0) word = String(game.countdown);
  if (game.phase === "playing" && game.timeLeft >= game.seconds) word = "Shoot";
  if (!word) return null;
  return (
    <div className="sg-count" role="status" aria-live="assertive" key={word}>
      {word}
    </div>
  );
}
