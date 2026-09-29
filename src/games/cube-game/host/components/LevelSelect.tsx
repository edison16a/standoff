"use client";
import type { CSSProperties } from "react";
import { LEVELS } from "../../levels";
import { themeFor } from "../../render/themes";
import { Logo } from "../../showcase/Logo";
import { useCubeStore } from "../store";
import { useSession } from "./session-context";

const DIFFICULTY = ["Easy", "Normal", "Hard", "Harder", "Insane", "Demon"] as const;
/** Five stars at most. A Demon level fills all five, drawn in red. */
const STARS = 5;
const css = (hex: number) => `#${hex.toString(16).padStart(6, "0")}`;

/**
 * The level select: seven cards from easy to the two Demon levels, each with its best
 * percent, then one player or a 1v1 race, and how to play. The chosen level's
 * song and a computer run of it play behind.
 */
export function LevelSelect() {
  const session = useSession();
  const { levelId, players, practice, progress } = useCubeStore();
  return (
    <div className="cg-menu">
      <div className="cg-menu__logo">
        <Logo />
      </div>
      <ol className="cg-levels" aria-label="Levels">
        {LEVELS.map(({ info }, i) => {
          const best = progress.best[info.id] ?? 0;
          const theme = themeFor(info.theme);
          const style = { "--level": css(theme.edge), "--level-2": css(theme.accent) } as CSSProperties;
          return (
            <li key={info.id}>
              <button
                type="button"
                className={`cg-level${info.id === levelId ? " cg-level--chosen" : ""}${info.difficulty > STARS ? " cg-level--demon" : ""}`}
                style={style}
                aria-pressed={info.id === levelId}
                aria-label={`${info.name}, ${DIFFICULTY[info.difficulty - 1]}, best ${best}%`}
                onClick={() => session.chooseLevel(info.id)}
                onMouseEnter={() => session.sound.sfx.hover()}
              >
                <span className="cg-level__number">{i + 1}</span>
                <span className="cg-level__name">{info.name}</span>
                <span className={`cg-level__face cg-level__face--${info.difficulty}`}>{DIFFICULTY[info.difficulty - 1]}</span>
                <span className="cg-level__stars" aria-hidden="true">
                  {"★".repeat(Math.min(STARS, info.difficulty))}
                  <span className="cg-level__stars-off">{"★".repeat(Math.max(0, STARS - info.difficulty))}</span>
                </span>
                <span className="cg-level__best">
                  <span className="cg-level__bar">
                    <span style={{ width: `${best}%` }} />
                  </span>
                  <span className="cg-level__percent">{best >= 100 ? "Complete" : `Best ${best}%`}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="cg-menu__options">
        <div className="cg-toggle" role="group" aria-label="Players">
          {([1, 2] as const).map((n) => (
            <button key={n} type="button" aria-pressed={players === n} onClick={() => session.setPlayers(n)}>
              {n === 1 ? "1 player" : "1v1"}
            </button>
          ))}
        </div>
        <button type="button" className="cg-check" aria-pressed={practice} onClick={() => session.setPractice(!practice)}>
          <span className="cg-check__box" aria-hidden="true" />
          Practice
        </button>
        <button type="button" className="cg-play" onClick={() => session.start("camera")}>
          Play
        </button>
        <button type="button" className="cg-link" onClick={() => session.start("keys")}>
          Play with the keyboard
        </button>
      </div>
      <p className="cg-menu__hint">
        Jump for real to jump. The camera only needs you from the waist up.{players === 2 ? " Race each other to the end. Player 1 stands on the left." : ""}
      </p>
    </div>
  );
}
