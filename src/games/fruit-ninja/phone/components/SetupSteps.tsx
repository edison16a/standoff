"use client";
import { useSyncExternalStore } from "react";
import { AimCalibrate } from "@/games/kit/aim/AimCalibrate";
import { AimPad } from "@/games/kit/aim/AimPad";
import { playerColor } from "@/games/kit/players";
import { StepShell } from "@/games/kit/steps/StepShell";
import { BLADE_IDS, BLADES } from "../../blades";
import { useFruitPhone } from "../phone-store";
import { BladeCanvas } from "./BladeCanvas";
import { usePhone } from "./session-context";

const STEPS = ["Calibrate", "Blade", "Ready"] as const;

/**
 * Without motion sensors the only way to swing is to drag, so the pad
 * comes out as soon as the player is ready. Its own component, so only
 * it redraws as the aim moves.
 */
function TouchPractice() {
  const session = usePhone();
  const snapshot = useSyncExternalStore(session.aim.subscribe, session.aim.getSnapshot, session.aim.getSnapshot);
  return snapshot.source === "touch" ? <AimPad aim={session.aim} /> : null;
}

/** Setup, one page per step: calibrate the aim, pick a blade, then say ready. */
export function SetupSteps() {
  const session = usePhone();
  const { step, blade, ready, seat, game } = useFruitPhone();
  const colour = playerColor(seat);

  if (step === "calibrate") {
    return (
      <StepShell steps={STEPS} current={0} title="Calibrate">
        <AimCalibrate aim={session.aim} colour={colour} onDone={() => session.goTo("blade")} />
      </StepShell>
    );
  }

  if (step === "blade") {
    return (
      <StepShell
        steps={STEPS}
        current={1}
        title="Choose your blade"
        footer={
          <>
            <button type="button" className="btn btn--ghost btn--lg" onClick={() => session.goTo("calibrate")}>
              Back
            </button>
            <button type="button" className="btn btn--primary btn--lg kit-grow" onClick={() => session.goTo("ready")}>
              Next
            </button>
          </>
        }
      >
        <div className="fn-blades" role="radiogroup" aria-label="Blade style">
          {BLADE_IDS.map((id) => (
            <button key={id} type="button" role="radio" aria-checked={id === blade} className="fn-blade" onClick={() => session.chooseBlade(id)}>
              <BladeCanvas blade={id} colour={colour} className="fn-blade__preview" />
              <span className="fn-blade__name">{BLADES[id].name}</span>
            </button>
          ))}
        </div>
      </StepShell>
    );
  }

  const inProgress = game && game.phase !== "lobby" && game.phase !== "over" && !game.inRound;
  return (
    <StepShell
      steps={STEPS}
      current={2}
      title={ready ? "You are in" : "Ready?"}
      footer={
        ready ? (
          <button type="button" className="btn btn--ghost btn--lg kit-grow" onClick={() => session.setReady(false)}>
            Not ready
          </button>
        ) : (
          <>
            <button type="button" className="btn btn--ghost btn--lg" onClick={() => session.goTo("blade")}>
              Back
            </button>
            <button type="button" className="btn btn--primary btn--lg kit-grow" onClick={() => session.setReady(true)}>
              Ready
            </button>
          </>
        )
      }
    >
      <BladeCanvas blade={blade} colour={colour} className="fn-ready__preview" />
      <ul className="fn-tips">
        <li>Point your phone where you want your blade.</li>
        <li>Swing fast through fruit to slice it. Slow moves do not cut.</li>
        <li>Big fruit takes several hits. Glowing fruit is worth a lot.</li>
        <li>Stay away from bombs.</li>
      </ul>
      {ready && <p className="fn-wait">{inProgress ? "A round is on. You join the next one." : "Waiting for the host to press Start. Try your blade on the practice fruit."}</p>}
      {ready && <TouchPractice />}
    </StepShell>
  );
}
