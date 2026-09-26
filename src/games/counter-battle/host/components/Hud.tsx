"use client";
import type { CSSProperties } from "react";
import { SplitMap } from "@/games/kit/split/SplitMap";
import type { TeamId } from "../../engine/fighter";
import { TEAMS } from "../../teams";
import { GunIcon } from "../../ui/GunIcon";
import { useCounterStore } from "../host-store";
import { PaneCorner } from "./PaneCorner";

const box = (r: { x: number; y: number; w: number; h: number }): CSSProperties => ({
  left: `${r.x * 100}%`,
  top: `${r.y * 100}%`,
  width: `${r.w * 100}%`,
  height: `${r.h * 100}%`,
});

/** One team's round wins as a row of pips, filled from the middle outward. */
function Pips({ team, won, of }: { team: TeamId; won: number; of: number }) {
  return (
    <span className={`cb-pips cb-pips--${team}`} aria-hidden="true">
      {Array.from({ length: of }, (_, i) => (
        <span key={i} className={`cb-pip ${i < won ? "cb-pip--won" : ""}`} />
      ))}
    </span>
  );
}

/** The score at the top middle: both teams' round wins and the round being played, with the split map under it. */
function Scoreboard() {
  const { score, round, roundsToWin, countdown, split } = useCounterStore();
  return (
    <div className="cb-score" aria-label={`Round ${round}. ${TEAMS[0].name} ${score[0]}, ${TEAMS[1].name} ${score[1]}`}>
      <div className="cb-score__bar">
        <span className="cb-score__team cb-score__team--0">
          <strong>{score[0]}</strong>
          <Pips team={0} won={score[0]} of={roundsToWin} />
        </span>
        <span className="cb-score__round">
          <small>Round</small>
          {round}
        </span>
        <span className="cb-score__team cb-score__team--1">
          <Pips team={1} won={score[1]} of={roundsToWin} />
          <strong>{score[1]}</strong>
        </span>
      </div>
      {countdown !== null && (
        <span key={countdown} className="cb-score__count">
          {countdown}
        </span>
      )}
      {split.length > 1 && <SplitMap panes={split} className="cb-score__map" />}
    </div>
  );
}

/** Who took down whom in the top right corner, the newest last. */
function KillFeed() {
  const feed = useCounterStore((s) => s.feed);
  return (
    <ol className="cb-feed" aria-live="polite">
      {feed.map((k) => (
        <li key={k.key} className="cb-feed__row">
          <span className="cb-feed__name" style={{ color: k.killer.colour, borderColor: TEAMS[k.killer.team].color }}>
            {k.killer.name}
          </span>
          <GunIcon gun={k.gun} size={46} className="cb-feed__gun" />
          {k.head && (
            <svg className="cb-feed__head" viewBox="0 0 24 24" aria-label="Head shot">
              <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            </svg>
          )}
          <span className="cb-feed__name" style={{ color: k.victim.colour, borderColor: TEAMS[k.victim.team].color }}>
            {k.victim.name}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The round's big words in the middle: the round, Fight, who took it, and the winner. */
function Banner() {
  const banner = useCounterStore((s) => s.banner);
  if (!banner) return null;
  const colour = banner.tone === "white" ? "#ffffff" : TEAMS[banner.tone].color;
  return (
    <div key={banner.key} className="cb-banner" style={{ "--banner": colour } as CSSProperties} aria-live="assertive">
      <strong>{banner.text}</strong>
      {banner.sub && <span>{banner.sub}</span>}
    </div>
  );
}

/**
 * The overlay during a match: each player's corner of their own view,
 * the score and split map at the top middle, the kill feed, the round
 * banners, and a label on the television camera's quarter.
 */
export function Hud() {
  const panes = useCounterStore((s) => s.panes);
  const tv = useCounterStore((s) => s.tv);
  const waiting = useCounterStore((s) => s.waiting);
  return (
    <div className="cb-hud">
      {panes.map((pane) => (
        <div key={pane.fighter} className="cb-pane" style={box(pane.rect)}>
          <PaneCorner pane={pane} />
        </div>
      ))}
      {tv && (
        <div className="cb-pane cb-pane--tv" style={box(tv)}>
          <span className="cb-pane__tv">Field camera</span>
        </div>
      )}
      <Scoreboard />
      <KillFeed />
      <Banner />
      {waiting.length > 0 && <p className="cb-hud__waiting">{waiting.join(", ")} will play next match</p>}
    </div>
  );
}
