"use client";
import { useEffect } from "react";
import { Joystick } from "@/games/kit/pad/Joystick";
import { PadButton } from "@/games/kit/pad/PadButton";
import type { CourtState } from "../../protocol";
import { TEAMS } from "../../roster";
import { BlockIcon, CallIcon, DribbleIcon, GuardIcon, PassIcon, ShootIcon, StealIcon } from "../../ui/icons";
import { useControllerStore } from "../controller-store";
import { useController } from "./session-context";
import { ShotMeter } from "./ShotMeter";

function Status({ court }: { court: CourtState }) {
  const flash = useControllerStore((s) => s.flash);
  const mine = TEAMS[court.team];
  const other = TEAMS[court.team === 0 ? 1 : 0];
  const ft = court.freeThrow;
  const line = ft ? (ft.mine ? `Your free throw, ${ft.n} of ${ft.of}` : `Free throw ${ft.n} of ${ft.of}`) : null;
  const ball = line ?? (court.checking ? (court.hasBall ? "Check ball" : "Check up") : court.hasBall ? "Your ball" : court.holder ? `${court.holder} has it` : "Loose ball");
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
      {court.defending && !ft && <GuardRange state={court.guard} />}
      {ft?.ready && <span className="nba-status__warn">Hold Shoot, let go in the green</span>}
      {court.onFire && <span className="nba-status__fire">On fire</span>}
      {flash && (
        <strong key={flash.key} className={`nba-flash nba-flash--${flash.tone}`}>
          {flash.text}
        </strong>
      )}
    </div>
  );
}

/** Whether holding Guard is shadowing your man, or you are too far off him for it to help. */
function GuardRange({ state }: { state: CourtState["guard"] }) {
  const text = state === "on" ? "Guarding your man" : state === "far" ? "Too far to guard. Run closer" : "Hold Guard to shadow your man";
  return (
    <span className={`nba-guard nba-guard--${state}`}>
      <i aria-hidden="true" />
      {text}
    </span>
  );
}

interface Face {
  label: string;
  colour: string;
  icon: React.ReactNode;
  /** Shown faded: Steal from too far away still swipes, but only at air. */
  faint?: boolean;
}

/** The third button's face: Dribble with the ball, Steal on defence, Block anywhere else. */
function defendFace(court: CourtState): Face {
  if (court.hasBall) return { label: "Dribble", colour: "#14b8a6", icon: <DribbleIcon /> };
  if (court.canSteal) return { label: "Steal", colour: "#a855f7", icon: <StealIcon />, faint: !court.stealReach };
  return { label: "Block", colour: "#ef4444", icon: <BlockIcon /> };
}

/**
 * The phone as a controller, held sideways: the thumb stick on the
 * left moves your player the way the big screen shows, dribbling on its
 * own; on the right, Shoot with its meter, Pass (or Call for the ball)
 * and a third button that changes with the play: Dribble with the ball,
 * a move picked by the stick, and Block anywhere else. On defence the
 * three become Guard (held), Block and Steal. At the free throw line
 * the shooter gets a big meter and only Shoot.
 */
export function Controller({ court }: { court: CourtState }) {
  const session = useController();
  useEffect(() => {
    session.stream(true);
    return () => session.stream(false);
  }, [session]);
  const team = TEAMS[court.team];
  const defending = court.defending;
  const passLabel = defending ? "Block" : court.hasBall ? "Pass" : court.attacking ? "Call" : "Pass";
  const face = defendFace(court);
  // Dead ball: the check up, or free throws, where only the shooter's Shoot works once set.
  const dead = court.checking || court.freeThrow !== null;
  const canShoot = defending || (court.hasBall && (court.freeThrow ? court.freeThrow.ready : !court.checking));
  // At the line the shooter gets a big meter and only Shoot.
  const atLine = court.freeThrow?.mine ?? false;

  return (
    <div className={`nba-pad ${atLine ? "nba-pad--line" : ""}`} style={{ "--team": team.color } as React.CSSProperties}>
      <div className="nba-pad__stick">
        <Joystick alwaysShown colour={team.color} onChange={(stick) => session.pad.setStick(stick)} />
      </div>
      <Status court={court} />
      <div className="nba-pad__buttons">
        <div className="nba-pad__pass">
          <PadButton label={passLabel} colour={defending ? "#ef4444" : "#3b82f6"} disabled={(!court.attacking && !defending) || dead} onDown={() => session.press("pass")} onUp={() => session.release("pass")}>
            {defending ? <BlockIcon /> : court.hasBall || !court.attacking ? <PassIcon /> : <CallIcon />}
            <span>{passLabel}</span>
          </PadButton>
        </div>
        <div className={`nba-pad__defend ${face.faint ? "nba-pad__defend--faint" : ""}`}>
          <PadButton label={face.label} colour={face.colour} disabled={dead} onDown={() => session.press("defend")} onUp={() => session.release("defend")}>
            {face.icon}
            <span>{face.label}</span>
          </PadButton>
        </div>
        <div className="nba-pad__shoot">
          {!defending && <ShotMeter meter={court.meter} free={court.freeThrow?.ready ?? false} />}
          <PadButton
            label={defending ? "Guard" : "Shoot"}
            size="lg"
            colour={defending ? "#16a34a" : "#ff7a18"}
            disabled={!canShoot}
            onDown={() => session.press("shoot", !defending)}
            onUp={() => session.release("shoot")}
          >
            {defending ? <GuardIcon /> : <ShootIcon />}
            <span>{defending ? "Guard" : "Shoot"}</span>
          </PadButton>
        </div>
      </div>
    </div>
  );
}
