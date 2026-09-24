"use client";
import { useState } from "react";
import { useController } from "./session-context";

/**
 * The fallback for devices without motion sensors, like a laptop joining
 * to test. Buttons for jab and parry, a slider for footwork. It is less
 * fun, but it means every device can play.
 */
export function TouchControls() {
  const session = useController();
  const [move, setMove] = useState(0);

  const setFootwork = (value: number) => {
    setMove(value);
    session.setTouchMove(value);
  };

  return (
    <div className="touch">
      <label className="touch__move">
        <span className="label">Footwork</span>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.05}
          value={move}
          onChange={(event) => setFootwork(Number(event.target.value))}
          onPointerUp={() => setFootwork(0)}
        />
      </label>
      <div className="touch__buttons">
        <button type="button" className="btn btn--lg" onPointerDown={() => session.strike("parry")}>
          Parry
        </button>
        <button type="button" className="btn btn--lg btn--primary" onPointerDown={() => session.strike("jab")}>
          Jab
        </button>
      </div>
    </div>
  );
}
