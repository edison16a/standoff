"use client";
import { useEffect, useState } from "react";
import { TEAMS } from "../../roster";
import { useControllerStore } from "../controller-store";
import { Controller } from "./Controller";
import { Setup } from "./Setup";

function usePortrait(): boolean {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const check = () => setPortrait(window.innerHeight > window.innerWidth);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return portrait;
}

/**
 * Basketball 3v3 on the phone: the setup steps, then the controller while this
 * phone has a player in the game, then the result. A phone that joins
 * during a game stays in setup until the next one.
 */
export function PhoneScreen() {
  const host = useControllerStore((s) => s.host);
  const portrait = usePortrait();

  if (host?.playing && host.court && (host.phase === "countdown" || host.phase === "live")) {
    return (
      <div className="nba-phone nba-phone--pad">
        <Controller court={host.court} />
        {portrait && (
          <div className="nba-turn">
            <strong>Turn your phone sideways</strong>
            <span>Hold it like a game controller.</span>
          </div>
        )}
      </div>
    );
  }

  if (host?.playing && host.phase === "over" && host.result && host.team !== null) {
    const r = host.result;
    return (
      <div className="nba-phone nba-result" style={{ "--team": TEAMS[host.team].color } as React.CSSProperties}>
        <span className="nba-result__label">{r.won ? "You win" : "Good game"}</span>
        <strong className="nba-result__score">
          {host.court?.score[host.team] ?? 0} <small>to</small> {host.court?.score[host.team === 0 ? 1 : 0] ?? 0}
        </strong>
        <span className="nba-result__line">
          {r.points} points, {r.rebounds} rebounds, {r.assists} assists
        </span>
        <span className="muted">Play again or change teams on the big screen.</span>
      </div>
    );
  }

  return (
    <div className="nba-phone">
      <Setup />
    </div>
  );
}
