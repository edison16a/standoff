"use client";
import { Icon } from "@/components/ui/Icon";
import type { Slot } from "@/games/fencing/players";
import { useControllerStore } from "../controller-store";
import { CalibratePanel } from "./CalibratePanel";
import { CharacterPicker } from "./CharacterPicker";
import { useController } from "./session-context";

/** Before the match: pick a fencer, calibrate, then say you are ready. */
export function LobbySteps({ slot }: { slot: Slot }) {
  const session = useController();
  const { pick, ready, calibrated, game } = useControllerStore();
  const other = slot === 1 ? 1 : 0;
  const otherReady = game?.ready[other] ?? false;
  const otherHere = game?.connected[other] ?? false;
  const computer = game?.computer[other] ?? false;
  const canReady = pick !== null && calibrated;

  return (
    <div className="steps">
      <section className="phone-card">
        <header className="step__head">
          <span className="step__num">1</span>
          <h2>Fencer</h2>
        </header>
        <CharacterPicker slot={slot} />
      </section>
      <section className="phone-card">
        <header className="step__head">
          <span className="step__num">2</span>
          <h2>Calibrate</h2>
        </header>
        <CalibratePanel slot={slot} />
      </section>
      <div className="ready-bar">
        {ready && !otherReady && <p className="muted">Waiting for your opponent</p>}
        {(!otherHere || computer) && (
          <button type="button" className="btn btn--ghost btn--block" onClick={() => session.press({ kind: "solo", on: !computer })}>
            <Icon name={computer ? "phone" : "cpu"} />
            {computer ? "Play a friend instead" : "Play the computer"}
          </button>
        )}
        <button
          type="button"
          className={`btn btn--lg btn--block ${ready ? "" : "btn--primary"}`}
          disabled={!canReady}
          onClick={() => session.setReady(!ready)}
        >
          <Icon name={ready ? "close" : "check"} />
          {ready ? "Not ready" : "Ready"}
        </button>
      </div>
    </div>
  );
}
