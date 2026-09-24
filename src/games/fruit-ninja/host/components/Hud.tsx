"use client";
import { playerColor } from "@/games/kit/players";
import { useFruitStore } from "../host-store";

function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The round clock at the top and the live leaderboard at the top right. */
export function Hud() {
  const hud = useFruitStore((state) => state.hud);
  const settings = useFruitStore((state) => state.settings);
  const seconds = hud.phase === "countdown" ? settings.seconds : hud.secondsLeft;
  const hurry = hud.phase === "playing" && seconds <= 10;
  const top = hud.standings[0]?.score ?? 0;

  return (
    <>
      <div className={`fn-clock ${hurry ? "fn-clock--hurry" : ""}`} role="timer" aria-label="Time left">
        {hud.phase === "ending" || hud.phase === "over" ? "Time!" : clock(seconds)}
      </div>
      <ol className="fn-board" aria-label="Scores">
        {hud.standings.map((row, index) => (
          <li key={row.seat} className={`fn-board__row ${row.active ? "" : "fn-board__row--gone"}`} style={{ ["--pop" as string]: playerColor(row.seat) }}>
            <span className="fn-board__place">{index + 1}</span>
            <span className="fn-board__name">
              {row.name}
              {top > 0 && row.score === top && (
                <svg className="fn-board__crown" viewBox="0 0 24 16" aria-label="Leader">
                  <path d="M2 14 L4 4 L9 9 L12 2 L15 9 L20 4 L22 14 Z" />
                </svg>
              )}
            </span>
            <span key={row.score} className="fn-board__score">
              {row.score}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}
