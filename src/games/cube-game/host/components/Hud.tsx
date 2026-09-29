"use client";
import { playerColor } from "@/games/kit/players";
import { LEVELS } from "../../levels";
import { placeName } from "../race";
import { useCubeStore, type HudPlayer } from "../store";
import { PaneFinish } from "./PaneFinish";

const MODE_NAME = { cube: "Cube", ufo: "UFO", ball: "Ball" } as const;

interface PlayerHudProps {
  slot: number;
  all: readonly HudPlayer[];
  stored: number;
}

function PlayerHud({ slot, all, stored }: PlayerHudProps) {
  const hud = all[slot - 1]!;
  const players = all.length;
  // No leader at the start, or while level: the place tag only shows once someone is ahead.
  const racing = players > 1 && all.some((p) => p.place !== hud.place);
  const banner = useCubeStore((s) => (s.banner?.slot === slot ? s.banner : null));
  const practice = useCubeStore((s) => s.practice);
  const results = useCubeStore((s) => s.phase === "results");
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
        {racing && <span className={`cg-tag ${hud.place === 1 ? "cg-tag--lead" : "cg-tag--dark"}`}>{placeName(hud.place)}</span>}
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
      {!results && <PaneFinish slot={slot} hud={all} />}
    </section>
  );
}

/** The HUD over each player's half: progress, best, mode, race place, and messages. */
export function Hud() {
  const hud = useCubeStore((s) => s.hud);
  const levelId = useCubeStore((s) => s.levelId);
  const stored = useCubeStore((s) => s.progress.best[levelId] ?? 0);
  const name = LEVELS.find((l) => l.info.id === levelId)?.info.name ?? "";
  return (
    <div className="cg-huds">
      {hud.map((_, i) => (
        <PlayerHud key={i} slot={i + 1} all={hud} stored={stored} />
      ))}
      <p className="cg-hud__level">{name}</p>
    </div>
  );
}
