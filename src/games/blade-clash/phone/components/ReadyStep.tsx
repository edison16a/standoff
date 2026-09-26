"use client";
import { Icon } from "@/components/ui/Icon";
import { CharacterBadge } from "@/games/blade-clash/components/CharacterBadge";
import { CHARACTERS } from "@/games/blade-clash/characters";
import type { Slot } from "@/games/blade-clash/players";
import { playerColor } from "@/games/kit/players";
import { StepShell } from "@/games/kit/steps/StepShell";
import { useControllerStore } from "../controller-store";
import { useController } from "./session-context";

/** The last page: your fighter, who you are waiting for, and the Ready button. */
export function ReadyStep({ slot, steps, onBack }: { slot: Slot; steps: readonly string[]; onBack(): void }) {
  const session = useController();
  const { pick, ready, game } = useControllerStore();
  const other = slot === 1 ? 1 : 0;
  const otherReady = game?.ready[other] ?? false;
  const otherHere = game?.connected[other] ?? false;
  const computer = game?.computer[other] ?? false;

  return (
    <StepShell
      steps={steps}
      current={steps.length - 1}
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
          <CharacterBadge characterId={pick} trim={playerColor(slot)} className="ready-card__art" />
          <strong>{CHARACTERS[pick].name}</strong>
          <span className="muted">{CHARACTERS[pick].tagline}</span>
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
