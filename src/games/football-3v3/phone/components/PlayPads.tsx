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
 * The QB: the same move stick as everyone under the left thumb, the
 * throw stick under the right. Before the snap the middle is one big Hike button with the
 * seconds left; after it, Juke.
 */
export function QbPad({ host }: { host: PhoneState }) {
  const phone = usePhone();
  const presnap = host.phase === "presnap";
  return (
    <div className="fb-pad fb-pad--qb">
      <div className="fb-pad__left">
        <Joystick alwaysShown colour={colourOf(host)} onChange={(stick) => phone.move(stick)} />
      </div>
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
          </div>
        )}
      </div>
      <div className="fb-pad__right">
        <ThrowStick disabled={!host.canThrow} onAim={(stick) => phone.aim(stick)} onThrow={(stick) => phone.throwBall(stick)} />
      </div>
    </div>
  );
}

/** A runner, or the QB once past the line: the run stick, Dive and Juke. */
export function RunnerPad({ host }: { host: PhoneState }) {
  const phone = usePhone();
  const live = host.phase === "live" && !host.grounded;
  return (
    <div className="fb-pad fb-pad--runner">
      <div className="fb-pad__left">
        <Joystick alwaysShown colour={colourOf(host)} onChange={(stick) => phone.move(stick)} />
      </div>
      <div className="fb-pad__middle">
        <PadInfo host={host} />
      </div>
      <div className="fb-pad__right fb-pad__buttons">
        <Hold button="juke" icon="juke" text="Juke" colour="#a855f7" disabled={!live || !host.jukeReady} />
        <Hold button="dive" icon="dive" text="Dive" colour="#ef4444" size="lg" disabled={!live} />
      </div>
    </div>
  );
}

/** The defence: the move stick, Tackle, Rush, and Guard held to tail the nearest receiver. */
export function DefensePad({ host }: { host: PhoneState }) {
  const phone = usePhone();
  const live = host.phase === "live" && !host.grounded;
  return (
    <div className="fb-pad fb-pad--defense">
      <div className="fb-pad__left">
        <Joystick alwaysShown colour={colourOf(host)} onChange={(stick) => phone.move(stick)} />
      </div>
      <div className="fb-pad__middle">
        <PadInfo host={host} />
      </div>
      <div className="fb-pad__right fb-pad__buttons fb-pad__buttons--three">
        <Hold button="rush" icon="rush" text="Rush" colour="#f97316" disabled={!live || !host.rushReady} />
        <Hold button="guard" icon="guard" text={host.guarding ? "Guarding" : "Guard"} colour="#2563eb" disabled={!live} />
        <Hold button="tackle" icon="tackle" text="Tackle" colour="#dc2626" size="lg" disabled={!live} />
      </div>
    </div>
  );
}

/** Between plays, or while someone else acts: the score and what is going on, and Skip during a replay. */
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
