"use client";
import { BOT_LEVELS, BOT_LEVEL_LABELS, type BotLevel } from "./difficulty";
import "./difficulty.css";

interface DifficultyPickerProps {
  level: BotLevel;
  onChange(level: BotLevel): void;
  /** What the row sets, for a game whose computer side is not players, like a horde of zombies. */
  label?: string;
}

/** The lobby row every game with bots shows: Easy, Medium, Hard, Training. */
export function DifficultyPicker({ level, onChange, label = "Computer difficulty" }: DifficultyPickerProps) {
  return (
    <div className="kit-difficulty" role="group" aria-label={label}>
      <span className="kit-difficulty__label">{label}</span>
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
