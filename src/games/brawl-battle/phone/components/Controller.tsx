"use client";
import { useEffect } from "react";
import { Joystick } from "@/games/kit/pad/Joystick";
import { PadButton } from "@/games/kit/pad/PadButton";
import { playerColor } from "@/games/kit/players";
import { RULES } from "../../engine/tuning";
import { BUTTONS, type PhoneState } from "../../protocol";
import { Portrait } from "../../ui/Portrait";
import { heatColour } from "../../ui/heat";
import { usePhoneStore } from "../phone-store";
import { ChargeButton } from "./ChargeButton";
import { useController } from "./session-context";

/** The Ult button with its charge as a ring round it. It only works once the ring is full. */
function UltButton({ ult }: { ult: number }) {
  const session = useController();
  const ready = ult >= 1;
  const r = 47;
  const length = 2 * Math.PI * r;
  return (
    <div className={`bb-ultbtn ${ready ? "bb-ultbtn--ready" : ""}`}>
      <svg className="bb-ultbtn__ring" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={r} className="bb-ultbtn__track" />
        {/* An empty dash still draws its round cap as a dot, so an empty meter draws no fill. */}
        {ult > 0 && <circle cx="50" cy="50" r={r} className="bb-ultbtn__fill" strokeDasharray={`${length * Math.min(1, ult)} ${length}`} transform="rotate(-90 50 50)" />}
      </svg>
      <PadButton label={ready ? "Ult, ready" : `Ult, ${Math.floor(ult * 100)} percent charged`} colour="#eab308" disabled={!ready} onDown={() => session.press(BUTTONS.ult)} onUp={() => session.release(BUTTONS.ult)}>
        <span>Ult</span>
      </PadButton>
    </div>
  );
}

/** Your fighter, damage and lives, with a word flashed for the big moments. */
function Status({ host, seat }: { host: PhoneState; seat: number }) {
  const flash = usePhoneStore((s) => s.flash);
  const colour = playerColor(seat);
  return (
    <div className="bb-status" style={{ "--heat": heatColour(host.percent), "--fighter": colour } as React.CSSProperties}>
      {host.pick && <Portrait character={host.pick} colour={colour} size={52} className="bb-status__face" />}
      {host.out ? (
        <strong className="bb-status__out">Out</strong>
      ) : (
        <strong className="bb-status__percent">
          {host.percent}
          <small>%</small>
        </strong>
      )}
      <span className="bb-status__stocks" aria-label={`${host.stocks} lives`}>
        {Array.from({ length: RULES.stocks }, (_, i) => (
          <span key={i} className={`bb-stock ${i < host.stocks ? "" : "bb-stock--lost"}`} />
        ))}
      </span>
      {host.banner && <span className="bb-status__banner">{host.banner}</span>}
      {host.out && <span className="bb-status__note">Watch the rest on the big screen.</span>}
      {flash && (
        <strong key={flash.key} className={`bb-flash bb-flash--${flash.tone}`}>
          {flash.text}
        </strong>
      )}
    </div>
  );
}

/**
 * The phone as a controller: the stick on the left (push up to jump,
 * let it come back and push up again in the air for a double jump, hold
 * down to shield or drop through), and Attack, Special and Ult on the
 * right. The way the stick points picks each move's variant, and holding
 * Attack or Special charges it. Works held sideways or upright.
 */
export function Controller({ host, seat }: { host: PhoneState; seat: number }) {
  const session = useController();
  useEffect(() => {
    session.stream(true);
    return () => session.stream(false);
  }, [session]);
  const colour = playerColor(seat);

  return (
    <div className="bb-pad">
      <Status host={host} seat={seat} />
      <div className="bb-pad__stick" style={{ "--pad-colour": colour } as React.CSSProperties}>
        <Joystick alwaysShown colour={colour} onChange={(stick) => session.setStick(stick)} />
      </div>
      <div className="bb-pad__buttons">
        <div className="bb-pad__ult">
          <UltButton ult={host.ult} />
        </div>
        <div className="bb-pad__special">
          <ChargeButton button={BUTTONS.special} label="Special" colour="#8b5cf6" />
        </div>
        <div className="bb-pad__attack">
          <ChargeButton button={BUTTONS.attack} label="Attack" size="lg" colour="#ff6b35" />
        </div>
      </div>
    </div>
  );
}
