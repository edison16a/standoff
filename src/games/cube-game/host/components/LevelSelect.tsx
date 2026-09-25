"use client";
import type { CSSProperties } from "react";
import { LEVELS } from "../../levels";
import { themeFor } from "../../render/themes";
import { Logo } from "../../showcase/Logo";
import { useCubeStore } from "../store";
import { useSession } from "./session-context";

const DIFFICULTY = ["Easy", "Normal", "Hard", "Harder", "Insane"] as const;
const css = (hex: number) => `#${hex.toString(16).padStart(6, "0")}`;

/**
 * The level select: five cards from easy to insane, each with its best
 * percent, then how many players and how to play. The chosen level's
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
          const locked = i >= progress.unlocked;
          const best = progress.best[info.id] ?? 0;
          const theme = themeFor(info.theme);
          const style = { "--level": css(theme.edge), "--level-2": css(theme.accent) } as CSSProperties;
          return (
            <li key={info.id}>
              <button
                type="button"
                className={`cg-level${info.id === levelId ? " cg-level--chosen" : ""}${locked ? " cg-level--locked" : ""}`}
                style={style}
                aria-pressed={info.id === levelId}
                aria-label={locked ? `${info.name}, locked` : `${info.name}, ${DIFFICULTY[info.difficulty - 1]}, best ${best}%`}
                disabled={locked}
                onClick={() => session.chooseLevel(info.id)}
                onMouseEnter={() => !locked && session.sound.sfx.hover()}
              >
                <span className="cg-level__number">{i + 1}</span>
                <span className="cg-level__name">{info.name}</span>
                <span className={`cg-level__face cg-level__face--${info.difficulty}`}>{DIFFICULTY[info.difficulty - 1]}</span>
                <span className="cg-level__stars" aria-hidden="true">
                  {"★".repeat(info.difficulty)}
                  <span className="cg-level__stars-off">{"★".repeat(5 - info.difficulty)}</span>
                </span>
                <span className="cg-level__best">
                  <span className="cg-level__bar">
                    <span style={{ width: `${best}%` }} />
                  </span>
                  <span className="cg-level__percent">{locked ? "Locked" : best >= 100 ? "Complete" : `Best ${best}%`}</span>
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
              {n === 1 ? "1 player" : "2 players"}
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
        Jump for real to jump. {players === 2 ? "Player 1 stands on the left." : "Stand back so the camera sees you from head to hips."}
      </p>
    </div>
  );
}
