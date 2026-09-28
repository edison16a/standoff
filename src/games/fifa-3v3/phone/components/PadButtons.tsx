"use client";
import { PadButton } from "@/games/kit/pad/PadButton";
import type { PhoneState } from "../../protocol";
import { ButtonFace } from "./ButtonFace";
import { usePhone } from "./session-context";

export type PadMode = "attack" | "defend" | "setpiece";

/** Which buttons the phone shows: attacking, defending, or taking or waiting on a set piece. */
export function padMode(host: PhoneState): PadMode {
  if (host.setPiece) return "setpiece";
  return host.defending ? "defend" : "attack";
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
