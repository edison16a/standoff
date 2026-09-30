"use client";
import { Joystick } from "@/games/kit/pad/Joystick";
import { PadButton } from "@/games/kit/pad/PadButton";
import type { PadButton as Button, PhoneState } from "../../protocol";
import { TEAMS } from "../../teams";
import { ButtonFace, type FaceIcon } from "./ButtonFace";
import { PadInfo } from "./PadInfo";
import { usePhone } from "./session-context";
import { ThrowStick } from "./ThrowStick";

/** A round button that presses one of the pad's buttons while held. */
function Hold({ button, icon, text, colour, size = "md", disabled }: { button: Button | "skip"; icon: FaceIcon; text: string; colour: string; size?: "lg" | "md"; disabled: boolean }) {
  const phone = usePhone();
  return (
    <PadButton label={text} size={size} colour={colour} disabled={disabled} onDown={() => phone.press(button, true)} onUp={() => phone.press(button, false)}>
      <ButtonFace icon={icon} text={text} />
    </PadButton>
  );
}

const colourOf = (host: PhoneState) => TEAMS[host.team ?? 0].color;

/**
 * The QB's middle and right: before the snap one big Hike button with
 * the seconds left, after it Juke and Run. On the right the throw stick,
 * or on a run call a big Pass button for the pitch. Run hands him the
 * runner's pad for the rest of the play (engine/qb-run.ts).
 */
function QbControls({ host }: { host: PhoneState }) {
  const phone = usePhone();
  const presnap = host.phase === "presnap";
  return (
    <>
      <div className="fb-pad__middle">
        <PadInfo host={host} />
        {presnap ? (
          <div className="fb-hike" key="hike">
            <Hold button="hike" icon="ball" text="Hike" colour="#16a34a" size="lg" disabled={false} />
            {host.hikeLeft !== null && <span className="fb-hike__left">{host.hikeLeft}</span>}
          </div>
        ) : (
          <div className="fb-pad__row" key="juke">
            <Hold button="juke" icon="juke" text="Juke" colour="#a855f7" disabled={host.phase !== "live" || !host.jukeReady || host.grounded} />
            <Hold button="run" icon="run" text="Run" colour="#0d9488" disabled={!host.canRun || host.grounded} />
          </div>
        )}
      </div>
      <div className="fb-pad__right">
        {host.runPlay ? (
          <Hold button="pass" icon="ball" text="Pass" colour="#9333ea" size="lg" disabled={!host.canPitch} />
        ) : (
          <ThrowStick disabled={!host.canThrow} onAim={(stick) => phone.aim(stick)} onThrow={(stick) => phone.throwBall(stick)} />
        )}
      </div>
    </>
  );
}

/** A runner, or the QB once he pressed Run or crossed the line: Juke, and Dive biggest under the thumb. */
function RunnerControls({ host }: { host: PhoneState }) {
  const live = host.phase === "live" && !host.grounded;
  return (
    <>
      <div className="fb-pad__middle">
        <PadInfo host={host} />
      </div>
      <div className="fb-pad__right fb-pad__buttons fb-pad__buttons--two">
        <Hold button="juke" icon="juke" text="Juke" colour="#a855f7" disabled={!live || !host.jukeReady} />
        <Hold button="dive" icon="dive" text="Dive" colour="#ef4444" size="lg" disabled={!live} />
      </div>
    </>
  );
}

/** The defence: Rush, Guard held to tail the nearest receiver, and Tackle biggest under the thumb. */
function DefenseControls({ host }: { host: PhoneState }) {
  const live = host.phase === "live" && !host.grounded;
  return (
    <>
      <div className="fb-pad__middle">
        <PadInfo host={host} />
      </div>
      <div className="fb-pad__right fb-pad__buttons fb-pad__buttons--three">
        <Hold button="rush" icon="rush" text="Rush" colour="#f97316" disabled={!live || !host.rushReady} />
        <Hold button="guard" icon="guard" text={host.guarding ? "Guarding" : "Guard"} colour="#2563eb" disabled={!live} />
        <Hold button="tackle" icon="tackle" text="Tackle" colour="#dc2626" size="lg" disabled={!live} />
      </div>
    </>
  );
}

/**
 * The QB, a runner and the defence. The move stick is always the first
 * child of the same element, so switching between these pads (the QB
 * pressing Run) never remounts it: the thumb holding it keeps its touch
 * and keeps steering. Only the buttons beside it change.
 */
export function StickPad({ host }: { host: PhoneState }) {
  const phone = usePhone();
  return (
    <div className={`fb-pad fb-pad--${host.pad}`}>
      <div className="fb-pad__left">
        <Joystick alwaysShown colour={colourOf(host)} onChange={(stick) => phone.move(stick)} />
      </div>
      {host.pad === "qb" && <QbControls host={host} />}
      {host.pad === "runner" && <RunnerControls host={host} />}
      {host.pad === "defense" && <DefenseControls host={host} />}
    </div>
  );
}

/** Between plays, or while someone else acts: what is going on, and Skip during a replay. */
export function WaitPad({ host }: { host: PhoneState }) {
  const agreed = host.skip?.agreed ?? false;
  return (
    <div className="fb-pad fb-pad--wait">
      <div className="fb-pad__middle fb-pad__middle--wide">
        <PadInfo host={host} />
        {host.skip && (
          <div className="fb-pad__row" key="skip">
            <Hold button="skip" icon="skip" text={agreed ? "Waiting" : "Skip"} colour="#64748b" size="lg" disabled={agreed} />
          </div>
        )}
      </div>
    </div>
  );
}
