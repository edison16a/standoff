"use client";
import { useState } from "react";
import type { Slot } from "@/games/blade-clash/players";
import { StepShell } from "@/games/kit/steps/StepShell";
import { useControllerStore } from "../controller-store";
import { CharacterPicker } from "./CharacterPicker";
import { ReadyStep } from "./ReadyStep";
import { CalibrateStep } from "./setup/CalibrateStep";

export const STEPS = ["Calibrate", "Fighter", "Ready"] as const;

/**
 * Before the fight, one page per step: calibrate the phone, pick a
 * fighter, then say you are ready. A phone coming back after a reconnect
 * starts at the first step it has not finished.
 */
export function LobbySteps({ slot }: { slot: Slot }) {
  const { pick, calibrated } = useControllerStore();
  const [step, setStep] = useState(() => (!calibrated ? 0 : pick ? 2 : 1));

  if (step === 0) return <CalibrateStep slot={slot} steps={STEPS} onDone={() => setStep(1)} />;

  if (step === 1) {
    return (
      <StepShell
        steps={STEPS}
        current={1}
        title="Pick your fighter"
        footer={
          <>
            <button type="button" className="btn btn--ghost btn--lg" onClick={() => setStep(0)}>
              Back
            </button>
            <button type="button" className="btn btn--primary btn--lg kit-grow" disabled={!pick} onClick={() => setStep(2)}>
              Next
            </button>
          </>
        }
      >
        <CharacterPicker slot={slot} />
      </StepShell>
    );
  }

  return <ReadyStep slot={slot} steps={STEPS} onBack={() => setStep(1)} />;
}
