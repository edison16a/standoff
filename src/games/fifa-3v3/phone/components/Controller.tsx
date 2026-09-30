"use client";
import { useEffect } from "react";
import { Joystick } from "@/games/kit/pad/Joystick";
import type { PhoneState } from "../../protocol";
import { ROLE_NAMES } from "../../roles";
import { TEAMS } from "../../teams";
import { ChargeBar } from "./ChargeBar";
import { PadButtons, padMode } from "./PadButtons";
import { GuardMeter, SetPieceCoach } from "./PadHelp";
import { usePhone } from "./session-context";

/**
 * The phone as a controller, held sideways: the thumb stick on the left
 * moves your player (and dribbles, and aims set pieces), the buttons on
 * the right change with the play (see PadButtons). The middle shows your
 * side and role, a status line, Guard's range while defending, and the
 * stages of a free kick or penalty. The score and the clock stay on the
 * big screen, so the buttons get the room.
 */
export function Controller({ host }: { host: PhoneState }) {
  const phone = usePhone();
  const team = host.team !== null ? TEAMS[host.team] : TEAMS[0];
  const mode = padMode(host);

  useEffect(() => {
    phone.controlling(true);
    return () => phone.controlling(false);
  }, [phone]);

  // A new layout of buttons lets go of anything held under the old one.
  useEffect(() => phone.letGo(), [phone, mode]);

  const skip = host.skip ? `Replay. Skip: ${host.skip.count} of ${host.skip.total}` : null;
  const status = skip ?? host.banner ?? (host.hasBall ? "You have the ball" : host.phase === "replay" ? "Replay" : host.phase === "kickoff" ? "Kick off" : host.phase === "foul" ? "Foul" : null);
  const power = host.setPiece?.part === "taker" && host.setPiece.stage === "power";

  return (
    <div className="fifa-pad" style={{ "--team": team.color } as React.CSSProperties}>
      <div className="fifa-pad__stick">
        <Joystick alwaysShown colour={team.color} onChange={(stick) => phone.stick(stick)} />
      </div>
      <div className="fifa-pad__middle">
        <div className="fifa-pad__me">
          <span className="fifa-pad__team">{team.name}</span>
          {host.role && <span>{ROLE_NAMES[host.role]}</span>}
        </div>
        {host.setPiece ? (
          <SetPieceCoach sp={host.setPiece} />
        ) : mode === "defend" && host.guard ? (
          <GuardMeter guard={host.guard} />
        ) : (
          status && <div className={`fifa-pad__status ${host.hasBall && !host.banner ? "fifa-pad__status--ball" : ""}`}>{status}</div>
        )}
        <ChargeBar hasBall={host.hasBall || power} />
      </div>
      <PadButtons host={host} />
    </div>
  );
}

/** The final whistle on the phone. */
export function ResultCard({ host }: { host: PhoneState }) {
  const won = host.result === "win";
  return (
    <div className={`fifa-result ${won ? "fifa-result--win" : ""}`}>
      <span className="fifa-result__label">Full time</span>
      <strong className="fifa-result__title">{won ? "You win!" : "You lose"}</strong>
      <span className="fifa-result__score">
        {TEAMS[0].code} {host.score[0]} : {host.score[1]} {TEAMS[1].code}
      </span>
      {host.goals > 0 && <span className="fifa-result__goals">You scored {host.goals === 1 ? "once" : `${host.goals} times`}</span>}
      <span className="muted">Play again from the big screen.</span>
    </div>
  );
}
