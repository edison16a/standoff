"use client";
import { BOT_LEVELS, BOT_LEVEL_LABELS, type BotLevel } from "./difficulty";
import "./difficulty.css";

/** The lobby row every game with bots shows: Easy, Medium, Hard, Training. */
export function DifficultyPicker({ level, onChange }: { level: BotLevel; onChange(level: BotLevel): void }) {
  return (
    <div className="kit-difficulty" role="group" aria-label="Computer difficulty">
      <span className="kit-difficulty__label">Computer difficulty</span>
      <div className="kit-difficulty__segments">
        {BOT_LEVELS.map((option) => (
          <button key={option} type="button" aria-pressed={option === level} onClick={() => onChange(option)}>
            {BOT_LEVEL_LABELS[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
