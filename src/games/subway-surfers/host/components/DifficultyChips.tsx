"use client";
import { DIFFICULTIES, DIFFICULTY_LABELS, type Difficulty } from "../../engine/difficulty";
import { setDifficulty, useSurfStore } from "../store";

/** A line under the chips on what each level means. */
const HINTS: Record<Difficulty, string> = {
  easy: "Starts at a jog and speeds up.",
  medium: "Starts fast, with a busy yard.",
  hard: "Starts near top speed.",
};

/** How hard the run starts: Easy, Medium or Hard. */
export function DifficultyChips() {
  const level = useSurfStore((s) => s.difficulty);
  return (
    <div className="ss-level">
      <div className="ss-level__chips" role="radiogroup" aria-label="Difficulty">
        {DIFFICULTIES.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={level === option}
            className={`ss-chip${level === option ? " ss-chip--on" : ""}`}
            onClick={() => setDifficulty(option)}
          >
            {DIFFICULTY_LABELS[option]}
          </button>
        ))}
      </div>
      <p className="ss-level__hint">{HINTS[level]}</p>
    </div>
  );
}
