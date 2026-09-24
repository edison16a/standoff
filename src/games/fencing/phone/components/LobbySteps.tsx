"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { FencerCanvas } from "@/games/fencing/components/FencerCanvas";
import { CHARACTERS } from "@/games/fencing/characters";
import type { Slot } from "@/games/fencing/players";
import { StepShell } from "@/games/kit/steps/StepShell";
import { useControllerStore } from "../controller-store";
import { CalibratePanel } from "./CalibratePanel";
import { CharacterPicker } from "./CharacterPicker";
import { useController } from "./session-context";

const STEPS = ["Calibrate", "Fencer", "Ready"] as const;

/**
 * Before the match, one page per step: calibrate the phone, pick a
 * fencer, then say you are ready. A phone coming back after a reconnect
 * starts at the first step it has not finished.
 */
export function LobbySteps({ slot }: { slot: Slot }) {
  const { pick, calibrated, inputMode } = useControllerStore();
  const setUp = calibrated || inputMode === "touch";
  const [step, setStep] = useState(() => (!setUp ? 0 : pick ? 2 : 1));

  if (step === 0) {
    return (
      <StepShell
        steps={STEPS}
        current={0}
        title="Calibrate"
        footer={
          <button type="button" className="btn btn--primary btn--lg kit-grow" disabled={!setUp} onClick={() => setStep(1)}>
            Next
          </button>
        }
      >
        <CalibratePanel slot={slot} />
      </StepShell>
    );
  }

  if (step === 1) {
    return (
      <StepShell
        steps={STEPS}
        current={1}
        title="Pick your fencer"
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

  return <ReadyStep slot={slot} onBack={() => setStep(1)} />;
}

/** The last page: your fencer, who you are waiting for, and the Ready button. */
function ReadyStep({ slot, onBack }: { slot: Slot; onBack(): void }) {
  const session = useController();
  const { pick, ready, game } = useControllerStore();
  const other = slot === 1 ? 1 : 0;
  const otherReady = game?.ready[other] ?? false;
  const otherHere = game?.connected[other] ?? false;
  const computer = game?.computer[other] ?? false;

  return (
    <StepShell
      steps={STEPS}
      current={2}
      title={ready ? "You're ready" : "Ready?"}
      footer={
        <>
          <button type="button" className="btn btn--ghost btn--lg" onClick={onBack} disabled={ready}>
            Back
          </button>
          <button type="button" className={`btn btn--lg kit-grow ${ready ? "" : "btn--primary"}`} onClick={() => session.setReady(!ready)}>
            <Icon name={ready ? "close" : "check"} />
            {ready ? "Not ready" : "Ready"}
          </button>
        </>
      }
    >
      {pick && (
        <div className="ready-card">
          <FencerCanvas characterId={pick} slot={slot} className="ready-card__art" />
          <strong>{CHARACTERS[pick].name}</strong>
        </div>
      )}
      {ready && !otherReady && <p className="muted">Waiting for your opponent</p>}
      {(!otherHere || computer) && (
        <button type="button" className="btn btn--ghost btn--block" onClick={() => session.press({ kind: "solo", on: !computer })}>
          <Icon name={computer ? "phone" : "cpu"} />
          {computer ? "Play a friend instead" : "Play the computer"}
        </button>
      )}
    </StepShell>
  );
}
