"use client";
import { useState } from "react";
import type { Slot } from "@/games/fencing/players";
import type { PracticeStage } from "@/games/fencing/phone/practice";
import { StepShell } from "@/games/kit/steps/StepShell";
import { useControllerStore } from "../controller-store";
import { CharacterPicker } from "./CharacterPicker";
import { ReadyStep } from "./ReadyStep";
import { CalibrateStep, type CalibratePage } from "./setup/CalibrateStep";
import { PracticeStep } from "./setup/PracticeStep";

export const STEPS = ["Calibrate", "Practice", "Fencer", "Ready"] as const;

const TITLES: Record<CalibratePage, string> = { hold: "Hold it like a sword", level: "Find your guard", follow: "Your sword follows" };

/**
 * Before the match, one page per step: calibrate the phone, practise a jab
 * and a parry, pick a fencer, then say you are ready. A phone coming back
 * after a reconnect starts at the first step it has not finished.
 */
export function LobbySteps({ slot }: { slot: Slot }) {
  const { pick, calibrated, inputMode, sensitivity, sensorsLive } = useControllerStore();
  const touch = inputMode === "touch";
  const [step, setStep] = useState(() => (!calibrated ? 0 : !sensitivity && !touch ? 1 : pick ? 3 : 2));
  const [page, setPage] = useState<CalibratePage>(calibrated ? "follow" : "hold");
  const [practice, setPractice] = useState<{ run: number; stage: PracticeStage }>({ run: 0, stage: "jab" });

  if (step === 0) {
    const next = (
      <button type="button" className="btn btn--primary btn--lg kit-grow" disabled={!touch && page === "hold" && !sensorsLive} onClick={() => (touch || page === "follow" ? setStep(1) : setPage("level"))}>
        Next
      </button>
    );
    const footer = touch ? next : page === "hold" ? next : page === "level" ? (
      <button type="button" className="btn btn--ghost btn--lg kit-grow" onClick={() => setPage("hold")}>
        Back
      </button>
    ) : (
      <>
        <button type="button" className="btn btn--ghost btn--lg" onClick={() => setPage("level")}>
          Redo
        </button>
        {next}
      </>
    );
    return (
      <StepShell steps={STEPS} current={0} title={touch ? "Buttons it is" : TITLES[page]} footer={footer}>
        <CalibrateStep slot={slot} page={page} onPage={setPage} />
      </StepShell>
    );
  }

  if (step === 1) {
    const done = touch || practice.stage === "done";
    const footer = done ? (
      <>
        <button type="button" className="btn btn--ghost btn--lg" onClick={() => (touch ? setStep(0) : setPractice({ run: practice.run + 1, stage: "jab" }))}>
          {touch ? "Back" : "Redo"}
        </button>
        <button type="button" className="btn btn--primary btn--lg kit-grow" onClick={() => setStep(2)}>
          Next
        </button>
      </>
    ) : (
      <>
        <button type="button" className="btn btn--ghost btn--lg" onClick={() => setStep(0)}>
          Back
        </button>
        <button type="button" className="btn btn--ghost btn--lg kit-grow" onClick={() => setStep(2)}>
          Skip practice
        </button>
      </>
    );
    return (
      <StepShell steps={STEPS} current={1} title={done ? "Ready to fence" : "Practice"} footer={footer}>
        <PracticeStep key={practice.run} slot={slot} onStage={(stage) => setPractice((p) => ({ ...p, stage }))} />
      </StepShell>
    );
  }

  if (step === 2) {
    return (
      <StepShell
        steps={STEPS}
        current={2}
        title="Pick your fencer"
        footer={
          <>
            <button type="button" className="btn btn--ghost btn--lg" onClick={() => setStep(1)}>
              Back
            </button>
            <button type="button" className="btn btn--primary btn--lg kit-grow" disabled={!pick} onClick={() => setStep(3)}>
              Next
            </button>
          </>
        }
      >
        <CharacterPicker slot={slot} />
      </StepShell>
    );
  }

  return <ReadyStep slot={slot} steps={STEPS} onBack={() => setStep(2)} />;
}
