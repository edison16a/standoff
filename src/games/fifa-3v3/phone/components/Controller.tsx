"use client";
import { useEffect, useState } from "react";
import { Joystick } from "@/games/kit/pad/Joystick";
import { PadButton } from "@/games/kit/pad/PadButton";
import type { PhoneState } from "../../protocol";
import { ROSTER } from "../../roster";
import { TEAMS } from "../../teams";
import { usePhone } from "./session-context";

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * The phone as a controller, held sideways: the thumb stick on the left
 * moves your player (and dribbles), Shoot and Slide on the right. Shoot
 * kicks the ball the way the stick points, and the game decides between
 * a shot and a pass. The middle shows your side, the score and the clock.
 */
export function Controller({ host }: { host: PhoneState }) {
  const phone = usePhone();
  const [charging, setCharging] = useState(false);
  const team = host.team !== null ? TEAMS[host.team] : TEAMS[0];
  const star = host.pick ? ROSTER[host.pick] : null;

  useEffect(() => {
    phone.controlling(true);
    return () => phone.controlling(false);
  }, [phone]);

  const status = host.banner ?? (host.hasBall ? "You have the ball" : host.phase === "replay" ? "Replay" : host.phase === "kickoff" ? "Kick off" : null);

  return (
    <div className="fifa-pad" style={{ "--team": team.color } as React.CSSProperties}>
      <div className="fifa-pad__stick">
        <Joystick colour={team.color} onChange={(stick) => phone.stick(stick)} />
      </div>
      <div className="fifa-pad__middle">
        <div className="fifa-pad__score" aria-label={`${TEAMS[0].name} ${host.score[0]}, ${TEAMS[1].name} ${host.score[1]}`}>
          <span style={{ color: TEAMS[0].color }}>{TEAMS[0].code}</span>
          <strong>
            {host.score[0]} : {host.score[1]}
          </strong>
          <span style={{ color: TEAMS[1].color }}>{TEAMS[1].code}</span>
        </div>
        <div className={`fifa-pad__clock ${host.golden ? "fifa-pad__clock--golden" : ""}`}>{host.golden ? "Golden goal" : clock(host.clock)}</div>
        <div className="fifa-pad__me">
          <span className="fifa-pad__team">{team.name}</span>
          {star && <span>{star.short}</span>}
          {host.goals > 0 && <span>{host.goals === 1 ? "1 goal" : `${host.goals} goals`}</span>}
        </div>
        {status && <div className={`fifa-pad__status ${host.hasBall && !host.banner ? "fifa-pad__status--ball" : ""}`}>{status}</div>}
      </div>
      <div className="fifa-pad__buttons">
        <div className={`fifa-pad__shoot ${charging ? "fifa-pad__shoot--charging" : ""}`}>
          <PadButton
            label="Shoot"
            size="lg"
            colour="#ef4444"
            onDown={() => {
              setCharging(true);
              phone.shoot(true);
            }}
            onUp={() => {
              setCharging(false);
              phone.shoot(false);
            }}
          />
        </div>
        <div className={`fifa-pad__slide ${host.hasBall ? "fifa-pad__slide--idle" : ""}`}>
          <PadButton label="Slide" size="md" colour="#f59e0b" onDown={() => phone.slide(true)} onUp={() => phone.slide(false)} />
        </div>
      </div>
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
