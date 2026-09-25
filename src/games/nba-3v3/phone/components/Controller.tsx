"use client";
import { useEffect } from "react";
import { Joystick } from "@/games/kit/pad/Joystick";
import { PadButton } from "@/games/kit/pad/PadButton";
import type { CourtState } from "../../protocol";
import { TEAMS } from "../../roster";
import { BlockIcon, CallIcon, PassIcon, ShootIcon, StealIcon } from "../../ui/icons";
import { useControllerStore } from "../controller-store";
import { useController } from "./session-context";
import { ShotMeter } from "./ShotMeter";

function Status({ court }: { court: CourtState }) {
  const flash = useControllerStore((s) => s.flash);
  const mine = TEAMS[court.team];
  const other = TEAMS[court.team === 0 ? 1 : 0];
  const ball = court.checking ? (court.hasBall ? "Check ball" : "Check up") : court.hasBall ? "Your ball" : court.holder ? `${court.holder} has it` : "Loose ball";
  return (
    <div className="nba-status">
      <span className="nba-status__team">{mine.name}</span>
      <div className="nba-status__score">
        <b style={{ color: mine.color }}>{court.score[court.team]}</b>
        <span>:</span>
        <b style={{ color: other.color }}>{court.score[court.team === 0 ? 1 : 0]}</b>
      </div>
      {court.countdown !== null && court.countdown > 0 ? (
        <strong className="nba-status__count">{court.countdown}</strong>
      ) : (
        <span className={`nba-status__clock ${court.shotClock <= 5 ? "nba-status__clock--late" : ""}`}>{court.shotClock}</span>
      )}
      <span className={`nba-status__ball ${court.hasBall ? "nba-status__ball--mine" : ""}`}>{ball}</span>
      {court.mustClear && <span className="nba-status__warn">Take it back past the arc</span>}
      {court.onFire && <span className="nba-status__fire">On fire</span>}
      {flash && (
        <strong key={flash.key} className={`nba-flash nba-flash--${flash.tone}`}>
          {flash.text}
        </strong>
      )}
    </div>
  );
}

/**
 * The phone as a controller, held sideways: the thumb stick on the
 * left moves your player the way the big screen shows, dribbling on its
 * own; on the right, Shoot with its meter, Pass (or Call for the ball)
 * and Block, which turns into Steal next to the ball on defence.
 */
export function Controller({ court }: { court: CourtState }) {
  const session = useController();
  useEffect(() => {
    session.stream(true);
    return () => session.stream(false);
  }, [session]);
  const team = TEAMS[court.team];
  const passLabel = court.hasBall ? "Pass" : court.attacking ? "Call" : "Pass";
  const defendLabel = court.canSteal ? "Steal" : "Block";

  return (
    <div className="nba-pad" style={{ "--team": team.color } as React.CSSProperties}>
      <div className="nba-pad__stick">
        <Joystick alwaysShown colour={team.color} onChange={(stick) => session.pad.setStick(stick)} />
      </div>
      <Status court={court} />
      <div className="nba-pad__buttons">
        <div className="nba-pad__pass">
          <PadButton label={passLabel} colour="#3b82f6" disabled={!court.attacking} onDown={() => session.press("pass")} onUp={() => session.release("pass")}>
            {court.hasBall || !court.attacking ? <PassIcon /> : <CallIcon />}
            <span>{passLabel}</span>
          </PadButton>
        </div>
        <div className="nba-pad__defend">
          <PadButton label={defendLabel} colour={court.canSteal ? "#a855f7" : "#ef4444"} onDown={() => session.press("defend")} onUp={() => session.release("defend")}>
            {court.canSteal ? <StealIcon /> : <BlockIcon />}
            <span>{defendLabel}</span>
          </PadButton>
        </div>
        <div className="nba-pad__shoot">
          <ShotMeter meter={court.meter} />
          <PadButton label="Shoot" size="lg" colour="#ff7a18" disabled={!court.hasBall} onDown={() => session.press("shoot")} onUp={() => session.release("shoot")}>
            <ShootIcon />
            <span>Shoot</span>
          </PadButton>
        </div>
      </div>
    </div>
  );
}
