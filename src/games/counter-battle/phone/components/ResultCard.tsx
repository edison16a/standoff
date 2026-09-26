"use client";
import type { CSSProperties } from "react";
import { playerColor } from "@/games/kit/players";
import type { PhoneState } from "../../protocol";
import { CHARACTERS } from "../../roster";
import { TEAMS } from "../../teams";

/** This player's end of the match: won or lost, the score, and their kills and deaths. */
export function ResultCard({ host, seat }: { host: PhoneState; seat: number }) {
  const team = host.team ?? 0;
  const style = { "--player": playerColor(seat), "--team": TEAMS[team].color } as CSSProperties;
  return (
    <div className={`cb-result ${host.won ? "cb-result--won" : ""}`} style={style}>
      <span className="cb-result__label">{host.won ? "You win" : "Good fight"}</span>
      <strong className="cb-result__score">
        {host.score[0]}
        <span>:</span>
        {host.score[1]}
      </strong>
      <span className="cb-result__line">
        {host.kills} {host.kills === 1 ? "kill" : "kills"}, {host.deaths} {host.deaths === 1 ? "death" : "deaths"}
      </span>
      {host.character && <span className="cb-result__who">You played the {CHARACTERS[host.character].name}</span>}
      <span className="muted">Play again or go to the menu on the big screen.</span>
    </div>
  );
}
