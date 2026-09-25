"use client";
import { playerColor } from "@/games/kit/players";
import type { PhoneState } from "../../protocol";
import { CHARACTERS } from "../../roster";
import { Portrait } from "../../ui/Portrait";
import { usePhoneStore } from "../phone-store";
import { Controller } from "./Controller";
import { Setup } from "./Setup";

const PLACES = ["1st", "2nd", "3rd", "4th"];

function ResultCard({ host, seat }: { host: PhoneState; seat: number }) {
  const won = host.place === 1;
  return (
    <div className="bb-result" style={{ "--fighter": playerColor(seat) } as React.CSSProperties}>
      {host.pick && <Portrait character={host.pick} colour={playerColor(seat)} size={96} />}
      <span className="bb-result__label">{won ? "You win" : "Good fight"}</span>
      <strong className="bb-result__place">{host.place ? PLACES[host.place - 1] : ""}</strong>
      <span className="bb-result__line">
        {host.pick ? CHARACTERS[host.pick].name : ""}, {host.kos} {host.kos === 1 ? "KO" : "KOs"}
      </span>
      <span className="muted">Play again or change fighters on the big screen.</span>
    </div>
  );
}

/**
 * Brawl Battle on the phone: the setup steps, then the controller while
 * this phone has a fighter in the match, then the result. A phone that
 * joins mid match stays in setup until the next one. Every screen fits
 * without scrolling, upright or sideways.
 */
export function PhoneScreen({ seat }: { seat: number }) {
  const host = usePhoneStore((s) => s.host);
  const fighting = host?.playing && (host.phase === "countdown" || host.phase === "fight" || host.phase === "game");
  return (
    <div className={`bb-phone ${fighting ? "bb-phone--pad" : ""}`}>
      {fighting ? <Controller host={host} seat={seat} /> : host?.playing && host.phase === "results" ? <ResultCard host={host} seat={seat} /> : <Setup seat={seat} />}
    </div>
  );
}
