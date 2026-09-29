"use client";
import { PadButton } from "@/games/kit/pad/PadButton";
import type { PhoneState } from "../../protocol";
import { ButtonFace } from "./ButtonFace";
import { usePhone } from "./session-context";

export type PadMode = "attack" | "defend" | "setpiece" | "replay";

/** Which buttons the phone shows: attacking, defending, taking or waiting on a set piece, or skipping a replay. */
export function padMode(host: PhoneState): PadMode {
  if (host.skip) return "replay";
  if (host.setPiece) return "setpiece";
  return host.defending ? "defend" : "attack";
}

/** During a goal replay: one big button to vote to skip it. It only skips once everyone has pressed. */
function SkipButton({ host }: { host: PhoneState }) {
  const phone = usePhone();
  const agreed = host.skip?.agreed ?? false;
  const text = agreed ? "Waiting" : "Skip";
  return (
    <div className="fifa-pad__buttons fifa-pad__buttons--one">
      <div className="fifa-pad__shoot" key="skip">
        <PadButton label={agreed ? "Waiting for the others" : "Skip replay"} size="lg" colour="#64748b" disabled={agreed} onDown={() => phone.shoot(true)} onUp={() => phone.shoot(false)}>
          <ButtonFace icon="ball" text={text} />
        </PadButton>
      </div>
    </div>
  );
}

/**
 * The buttons on the right. Attacking: Shoot/Pass, Slide or Skill, and
 * Steal. Defending, the big button is Guard (hold it), with Jump, Steal
 * and Slide. At a set piece only the taker has a button, which sets
 * each stage and then takes the kick. Each layout keys its own buttons,
 * so a held button is let go cleanly when the layout changes.
 */
export function PadButtons({ host }: { host: PhoneState }) {
  const phone = usePhone();
  const mode = padMode(host);
  const live = host.phase === "play";
  if (mode === "replay") return <SkipButton host={host} />;
  if (mode === "setpiece") {
    const sp = host.setPiece!;
    const taking = sp.part === "taker" && host.phase === "setpiece" && sp.stage !== "struck";
    const text = sp.stage === "power" ? "Kick" : "Set";
    return (
      <div className="fifa-pad__buttons fifa-pad__buttons--one">
        <div className="fifa-pad__shoot" key="setpiece">
          <PadButton label={taking ? text : "Wait"} size="lg" colour="#ef4444" disabled={!taking} onDown={() => phone.shoot(true)} onUp={() => phone.shoot(false)}>
            <ButtonFace icon="ball" text={taking ? text : "Wait"} />
          </PadButton>
        </div>
      </div>
    );
  }
  const steal = (
    <div className="fifa-pad__small" key={`steal-${mode}`}>
      <PadButton label="Steal" size="md" colour="#0ea5e9" disabled={!live || host.hasBall} onDown={() => phone.press("steal", true)} onUp={() => phone.press("steal", false)}>
        <ButtonFace icon="steal" text="Steal" />
      </PadButton>
    </div>
  );
  const slide = (
    <div className={`fifa-pad__slide ${host.hasBall ? "fifa-pad__slide--skill" : ""}`} key={`slide-${mode}`}>
      <PadButton label={host.hasBall ? "Skill" : "Slide"} size="md" colour={host.hasBall ? "#a855f7" : "#f59e0b"} disabled={!live} onDown={() => phone.slide(true)} onUp={() => phone.slide(false)}>
        <ButtonFace icon={host.hasBall ? "skill" : "slide"} text={host.hasBall ? "Skill" : "Slide"} />
      </PadButton>
    </div>
  );
  if (mode === "defend") {
    return (
      <div className="fifa-pad__buttons fifa-pad__buttons--four">
        <div className="fifa-pad__small" key="jump">
          <PadButton label="Jump" size="md" colour="#14b8a6" disabled={!live} onDown={() => phone.press("jump", true)} onUp={() => phone.press("jump", false)}>
            <ButtonFace icon="jump" text="Jump" />
          </PadButton>
        </div>
        <div className="fifa-pad__shoot" key="guard">
          <PadButton label="Guard" size="lg" colour="#2563eb" disabled={!live} onDown={() => phone.press("guard", true)} onUp={() => phone.press("guard", false)}>
            <ButtonFace icon="guard" text="Guard" />
          </PadButton>
        </div>
        {steal}
        {slide}
      </div>
    );
  }
  return (
    <div className="fifa-pad__buttons fifa-pad__buttons--four">
      <span />
      <div className="fifa-pad__shoot" key="shoot">
        <PadButton label="Shoot/Pass" size="lg" colour="#ef4444" disabled={!live} onDown={() => phone.shoot(true)} onUp={() => phone.shoot(false)}>
          <ButtonFace icon="ball" text="Shoot/Pass" />
        </PadButton>
      </div>
      {steal}
      {slide}
    </div>
  );
}
