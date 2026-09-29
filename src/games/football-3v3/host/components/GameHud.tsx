"use client";
import { playerColor } from "@/games/kit/players";
import { Scoreboard } from "../../render/hud/Scoreboard";
import { ROLE_SHORT } from "../../roles";
import { CHARACTERS } from "../../roster";
import { TEAMS } from "../../teams";
import { useFootballStore } from "../host-store";
import { ReplayOverlay } from "./ReplayOverlay";

/** A big moment told just above the score bug, like a broadcast's lower third. */
function CalloutBar() {
  const callout = useFootballStore((s) => s.callout);
  const replay = useFootballStore((s) => s.phase === "replay");
  if (!callout || replay) return null;
  return (
    <div key={callout.text + callout.sub} className="fb-callout" style={{ "--moment": callout.colour } as React.CSSProperties} aria-live="polite">
      <strong>{callout.text}</strong>
      {callout.sub && <span>{callout.sub}</span>}
    </div>
  );
}

/** Along the top: each phone's player, their star and role, and who has the ball. */
function PlayerStrip() {
  const strip = useFootballStore((s) => s.strip);
  const over = useFootballStore((s) => s.phase === "over");
  if (strip.length === 0 || over) return null;
  return (
    <ul className="fb-strip">
      {strip.map((p) => (
        <li
          key={p.id}
          className={`fb-strip__player ${p.hasBall ? "fb-strip__player--ball" : ""} ${p.away ? "fb-strip__player--away" : ""}`}
          style={{ "--player": playerColor(p.seat), "--team": TEAMS[p.team].color } as React.CSSProperties}
        >
          <span className="fb-strip__dot" />
          <span className="fb-strip__name">{p.name}</span>
          <span className="fb-strip__star">{p.away ? "Computer playing" : `${ROLE_SHORT[p.role]}, ${CHARACTERS[p.character].short}`}</span>
        </li>
      ))}
    </ul>
  );
}

/** The broadcast graphics over the game: nothing pops up across the picture. */
export function GameHud() {
  const board = useFootballStore((s) => s.board);
  return (
    <div className="fb-hud">
      <PlayerStrip />
      <CalloutBar />
      {board && <Scoreboard board={board} />}
      <ReplayOverlay />
    </div>
  );
}
