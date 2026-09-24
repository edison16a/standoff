"use client";
import { playerColor } from "@/games/kit/players";
import { ROSTER } from "../../roster";
import { TEAMS } from "../../teams";
import { useFifaStore } from "../host-store";

function clock(seconds: number): string {
  const s = Math.max(0, seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The television score bug: both teams, the score and the clock. */
function Scoreboard() {
  const score = useFifaStore((s) => s.score);
  const time = useFifaStore((s) => s.clock);
  const golden = useFifaStore((s) => s.golden);
  return (
    <div className="fifa-bug" role="status" aria-label={`${TEAMS[0].name} ${score[0]}, ${TEAMS[1].name} ${score[1]}`}>
      {([0, 1] as const).map((team) => (
        <div key={team} className={`fifa-bug__team fifa-bug__team--${team}`} style={{ "--team": TEAMS[team].color } as React.CSSProperties}>
          <span className="fifa-bug__code">{TEAMS[team].code}</span>
          <span className="fifa-bug__score">{score[team]}</span>
        </div>
      ))}
      <div className={`fifa-bug__clock ${golden ? "fifa-bug__clock--golden" : ""}`}>{golden ? "GOLDEN GOAL" : clock(time)}</div>
    </div>
  );
}

/** The big words for goals, saves and the woodwork. Keyed so each one plays its entrance. */
function BannerView() {
  const banner = useFifaStore((s) => s.banner);
  if (!banner) return null;
  return (
    <div key={banner.id} className="fifa-banner" style={{ "--banner": banner.colour } as React.CSSProperties} aria-live="assertive">
      <strong className="fifa-banner__text">{banner.text}</strong>
      {banner.sub && <span className="fifa-banner__sub">{banner.sub}</span>}
    </div>
  );
}

/** Along the bottom: each phone's player, their star and side, and who has the ball. */
function PlayerStrip() {
  const roster = useFifaStore((s) => s.roster);
  if (roster.length === 0) return null;
  return (
    <ul className="fifa-strip">
      {roster.map((p) => (
        <li
          key={p.id}
          className={`fifa-strip__player ${p.hasBall ? "fifa-strip__player--ball" : ""} ${p.away ? "fifa-strip__player--away" : ""}`}
          style={{ "--player": playerColor(p.seat), "--team": TEAMS[p.team].color } as React.CSSProperties}
        >
          <span className="fifa-strip__dot" />
          <span className="fifa-strip__name">{p.name}</span>
          <span className="fifa-strip__star">{p.away ? "Computer playing" : ROSTER[p.character].short}</span>
        </li>
      ))}
    </ul>
  );
}

export function MatchHud() {
  const replay = useFifaStore((s) => s.replay);
  return (
    <div className="fifa-hud">
      <Scoreboard />
      {replay && (
        <div className="fifa-replay" aria-label="Replay">
          <span className="fifa-replay__dot" />
          REPLAY
        </div>
      )}
      <BannerView />
      <PlayerStrip />
    </div>
  );
}
