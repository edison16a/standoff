"use client";
import { TEAMS } from "../../teams";
import { useFifaStore } from "../host-store";
import { ReplayOverlay } from "./ReplayOverlay";

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
      <MomentTag />
    </div>
  );
}

/** A stoppage under the score: the foul and the booking, then the free kick or penalty. */
function MomentTag() {
  const moment = useFifaStore((s) => s.moment);
  if (!moment) return null;
  return (
    <div className="fifa-bug__moment" style={{ "--moment": moment.colour } as React.CSSProperties} aria-live="polite">
      {moment.card && <span className="fifa-bug__card" aria-label="Yellow card" />}
      <strong>{moment.text}</strong>
      {moment.sub && <span>{moment.sub}</span>}
    </div>
  );
}

/**
 * No banners across the picture: goals and fouls are told by the score bug and the 3D scene. The ceremony has its own names instead.
 * No names along the bottom either: each player's tag over their head already says who they are and their build.
 */
export function MatchHud() {
  const ceremony = useFifaStore((s) => s.ceremony !== null);
  return (
    <div className="fifa-hud">
      {!ceremony && <Scoreboard />}
      <ReplayOverlay />
    </div>
  );
}
