"use client";
import { PadButton } from "@/games/kit/pad/PadButton";
import { BUTTONS, type PhoneState } from "../../protocol";
import { ButtonFace } from "./ButtonFace";
import { usePhone } from "./session-context";

/**
 * The buttons on the right of the controller. They change with what the
 * player is doing: attacking, defending, or taking a free kick or penalty.
 */
export function PadButtons({ host }: { host: PhoneState }) {
  if (host.mode === "defend") return <DefendButtons host={host} />;
  if (host.mode === "kick" || host.mode === "wait") return <KickButtons host={host} />;
  return <AttackButtons host={host} />;
}

/** Shoot/Pass, and Slide that turns into Skill with the ball. */
function AttackButtons({ host }: { host: PhoneState }) {
  const phone = usePhone();
  // The host only reads the buttons in open play; pressed at a kick off they would fill a bar for nothing.
  const live = host.phase === "play";
  return (
    <div className="fifa-pad__buttons">
      <div className="fifa-pad__shoot">
        <PadButton label="Shoot/Pass" size="lg" colour="#ef4444" disabled={!live} onDown={() => phone.shoot(true)} onUp={() => phone.shoot(false)}>
          <ButtonFace icon="ball" text="Shoot/Pass" />
        </PadButton>
      </div>
      <div className={`fifa-pad__slide ${host.hasBall ? "fifa-pad__slide--skill" : ""}`}>
        <PadButton label={host.hasBall ? "Skill" : "Slide"} size="md" colour={host.hasBall ? "#a855f7" : "#f59e0b"} disabled={!live} onDown={() => phone.slide(true)} onUp={() => phone.slide(false)}>
          <ButtonFace icon={host.hasBall ? "skill" : "slide"} text={host.hasBall ? "Skill" : "Slide"} />
        </PadButton>
      </div>
    </div>
  );
}

/** Guard (held), and Slide, Steal and Jump. Jump only works while Guard is marking the man. */
function DefendButtons({ host }: { host: PhoneState }) {
  const phone = usePhone();
  const live = host.phase === "play";
  const press = (name: string) => ({ onDown: () => phone.button(name, true), onUp: () => phone.button(name, false) });
  return (
    <div className="fifa-pad__buttons fifa-pad__buttons--defend">
      <div className={`fifa-pad__shoot fifa-pad__guard fifa-pad__guard--${host.guard}`}>
        <PadButton label="Guard" size="lg" colour="#0ea5e9" disabled={!live} {...press(BUTTONS.shoot)}>
          <ButtonFace icon="guard" text="Guard" />
        </PadButton>
      </div>
      <div className="fifa-pad__row">
        <PadButton label="Slide" size="md" colour="#f59e0b" disabled={!live} {...press(BUTTONS.slide)}>
          <ButtonFace icon="slide" text="Slide" />
        </PadButton>
        <PadButton label="Steal" size="md" colour="#16a34a" disabled={!live} {...press(BUTTONS.steal)}>
          <ButtonFace icon="steal" text="Steal" />
        </PadButton>
        <PadButton label="Jump" size="md" colour="#6366f1" disabled={!live || host.guard !== "on"} {...press(BUTTONS.jump)}>
          <ButtonFace icon="jump" text="Jump" />
        </PadButton>
      </div>
    </div>
  );
}

/**
 * Taking a kick: the big button sets each stage, then in the power stage
 * it is held for the bar and let go to strike. Slide goes back a stage.
 */
function KickButtons({ host }: { host: PhoneState }) {
  const phone = usePhone();
  const kick = host.kick;
  const mine = host.mode === "kick" && host.phase === "setpiece" && kick !== null && kick.stage !== "runup";
  const power = kick?.stage === "power";
  return (
    <div className="fifa-pad__buttons">
      <div className="fifa-pad__shoot">
        <PadButton label={power ? "Shoot" : "Set"} size="lg" colour={power ? "#ef4444" : "#10b981"} disabled={!mine} onDown={() => phone.shoot(true)} onUp={() => phone.shoot(false)}>
          <ButtonFace icon={power ? "ball" : "set"} text={power ? "Shoot" : "Set"} />
        </PadButton>
      </div>
      <div className="fifa-pad__slide">
        <PadButton label="Back" size="md" colour="#64748b" disabled={!mine || kick?.stage === "aim"} onDown={() => phone.slide(true)} onUp={() => phone.slide(false)}>
          <ButtonFace icon="back" text="Back" />
        </PadButton>
      </div>
    </div>
  );
}
