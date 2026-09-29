"use client";
import { DIFFICULTIES, DIFFICULTY, multiplierText, type Difficulty } from "../../engine/difficulty";
import { setDifficulty, useSurfStore } from "../store";

/** A line under the chips on what each level means. */
const HINTS: Record<Difficulty, string> = {
  easy: "Starts at a jog and speeds up.",
  medium: "Starts fast, with a busy yard.",
  hard: "Starts near top speed.",
  demon: "Past top speed and packed tight, with less time to react.",
};

/** How hard the run starts, each level with the multiplier it puts on every point. */
export function DifficultyChips() {
  const level = useSurfStore((s) => s.difficulty);
  return (
    <div className="ss-level">
      <div className="ss-level__chips" role="radiogroup" aria-label="Difficulty">
        {DIFFICULTIES.map((option) => {
          const { label, multiplier } = DIFFICULTY[option];
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={level === option}
              aria-label={`${label}, score ${multiplierText(multiplier)}`}
              className={`ss-chip ss-chip--level ss-chip--${option}${level === option ? " ss-chip--on" : ""}`}
              onClick={() => setDifficulty(option)}
            >
              {label}
              <span className="ss-chip__mult">{multiplierText(multiplier)}</span>
            </button>
          );
        })}
      </div>
      <p className="ss-level__hint">{HINTS[level]}</p>
    </div>
  );
}
