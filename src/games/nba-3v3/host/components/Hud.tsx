"use client";
import { TEAMS } from "../../roster";
import { useNbaStore } from "../host-store";

function BallDot() {
  return (
    <svg className="nba-board__ball" viewBox="0 0 20 20" aria-label="Has the ball">
      <circle cx="10" cy="10" r="9" fill="#e8742a" stroke="#1b0f0a" strokeWidth="1.2" />
      <path d="M1 10h18M10 1v18M4 3.5c3 3.5 3 9.5 0 13M16 3.5c-3 3.5-3 9.5 0 13" fill="none" stroke="#1b0f0a" strokeWidth="1.1" />
    </svg>
  );
}

/** The broadcast scoreboard across the top: both teams, the score, the shot clock and who has the ball. */
function Scoreboard() {
  const score = useNbaStore((s) => s.score);
  const clock = useNbaStore((s) => s.shotClock);
  const offence = useNbaStore((s) => s.offence);
  const gamePoint = useNbaStore((s) => s.gamePoint);
  const phase = useNbaStore((s) => s.phase);
  const checking = useNbaStore((s) => s.checking);
  const freeThrow = useNbaStore((s) => s.freeThrow);
  // The clock is stopped for the check up and for free throws, and a quiet word under it says why.
  const held = checking || freeThrow !== null;
  const word = freeThrow ?? (checking ? "Check ball" : "First to 11");
  const side = (team: 0 | 1) => (
    <div className={`nba-board__team nba-board__team--${team}`} style={{ "--team": TEAMS[team].color, "--team-dark": TEAMS[team].dark } as React.CSSProperties}>
      {team === 1 && <strong className="nba-board__score">{score[1]}</strong>}
      <span className="nba-board__name">
        {TEAMS[team].name}
        {gamePoint[team] && <em className="nba-board__gp">Game point</em>}
      </span>
      {phase === "live" && offence === team && <BallDot />}
      {team === 0 && <strong className="nba-board__score">{score[0]}</strong>}
    </div>
  );
  return (
    <div className="nba-board" role="status" aria-label={`${TEAMS[0].name} ${score[0]}, ${TEAMS[1].name} ${score[1]}`}>
      {side(0)}
      <div className={`nba-board__clock ${clock <= 5 && phase === "live" && !held ? "nba-board__clock--late" : ""} ${held ? "nba-board__clock--held" : ""}`}>
        <span>{String(clock).padStart(2, "0")}</span>
        <small key={word}>{word}</small>
      </div>
      {side(1)}
    </div>
  );
}

function Banner() {
  const banner = useNbaStore((s) => s.banner);
  if (!banner) return null;
  return (
    <div key={banner.key} className={`nba-banner nba-banner--${banner.tone}`} aria-live="polite">
      <strong>{banner.text}</strong>
      {banner.sub && <span>{banner.sub}</span>}
    </div>
  );
}

/**
 * The overlay during a game: the scoreboard, the countdown, the big
 * calls, and a reminder when the team with the ball must take it back
 * past the arc.
 */
export function Hud() {
  const countdown = useNbaStore((s) => s.countdown);
  const mustClear = useNbaStore((s) => s.mustClear);
  const phase = useNbaStore((s) => s.phase);
  const offence = useNbaStore((s) => s.offence);
  const waiting = useNbaStore((s) => s.waiting);
  return (
    <div className="nba-hud">
      <Scoreboard />
      {phase === "live" && mustClear && (
        <p className="nba-hud__clear" style={{ "--team": TEAMS[offence].color } as React.CSSProperties}>
          {TEAMS[offence].name}: take it back past the arc
        </p>
      )}
      {countdown !== null && countdown > 0 && (
        <div key={countdown} className="nba-count">
          {countdown}
        </div>
      )}
      <Banner />
      {waiting.length > 0 && phase !== "over" && <p className="nba-hud__waiting">{waiting.join(", ")} will join the next game</p>}
    </div>
  );
}
