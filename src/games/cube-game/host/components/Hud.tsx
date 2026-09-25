"use client";
import { playerColor } from "@/games/kit/players";
import { LEVELS } from "../../levels";
import { useCubeStore, type HudPlayer } from "../store";
import { Confetti } from "./Confetti";

const MODE_NAME = { cube: "Cube", ufo: "UFO", ball: "Ball" } as const;

function PlayerHud({ slot, hud, players, stored }: { slot: number; hud: HudPlayer; players: number; stored: number }) {
  const banner = useCubeStore((s) => (s.banner?.slot === slot ? s.banner : null));
  const practice = useCubeStore((s) => s.practice);
  const best = Math.max(stored, hud.best);
  return (
    <section className={`cg-hud cg-hud--${players === 1 ? "solo" : slot === 1 ? "top" : "bottom"}`} aria-label={`Player ${slot}`}>
      <div className="cg-progress" role="progressbar" aria-label="Progress through the level" aria-valuenow={hud.percent} aria-valuemin={0} aria-valuemax={100}>
        <span className="cg-progress__best" style={{ left: `${best}%` }} aria-hidden="true" />
        <span className="cg-progress__fill" style={{ width: `${hud.percent}%` }} />
        <span className="cg-progress__text">{hud.percent}%</span>
      </div>
      <div className="cg-hud__tags">
        {players > 1 && (
          <span className="cg-tag" style={{ background: playerColor(slot) }}>
            P{slot}
          </span>
        )}
        <span className="cg-tag cg-tag--dark">{MODE_NAME[hud.mode]}</span>
        {practice && <span className="cg-tag cg-tag--practice">Practice</span>}
        <span className="cg-tag cg-tag--dark">Best {best}%</span>
      </div>
      {banner && (
        <p key={banner.key} className="cg-banner">
          {banner.text}
        </p>
      )}
      {hud.status === "away" && <p className="cg-hud__notice">Step back into view</p>}
      {hud.status === "run" && hud.waiting && <p className="cg-hud__notice cg-hud__notice--soft">Get ready</p>}
      {hud.status === "done" && (
        <>
          <p className="cg-finish">Level complete</p>
          <Confetti />
        </>
      )}
    </section>
  );
}

/** The HUD over each player's half: progress, best, mode, and messages. */
export function Hud() {
  const hud = useCubeStore((s) => s.hud);
  const levelId = useCubeStore((s) => s.levelId);
  const stored = useCubeStore((s) => s.progress.best[levelId] ?? 0);
  const name = LEVELS.find((l) => l.info.id === levelId)?.info.name ?? "";
  return (
    <div className="cg-huds">
      {hud.map((player, i) => (
        <PlayerHud key={i} slot={i + 1} hud={player} players={hud.length} stored={stored} />
      ))}
      <p className="cg-hud__level">{name}</p>
    </div>
  );
}
