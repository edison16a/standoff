"use client";
import { Scoreboard } from "../../render/hud/Scoreboard";
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

/** The broadcast graphics over the game: nothing pops up across the picture. */
export function GameHud() {
  const board = useFootballStore((s) => s.board);
  // The trophy presentation has its own names; the score bug would sit on the scene.
  const ceremony = useFootballStore((s) => s.ceremony !== null);
  return (
    <div className="fb-hud">
      <CalloutBar />
      {board && !ceremony && <Scoreboard board={board} />}
      <ReplayOverlay />
    </div>
  );
}
