"use client";
import { playerColor } from "@/games/kit/players";
import { StepShell } from "@/games/kit/steps/StepShell";
import { FINISH_IDS, FINISHES } from "../../render/models/finishes";
import { GunPreview } from "./GunPreview";
import { usePhone, usePhoneState } from "./session-context";
import { STEPS } from "./steps";

/** Step two: the player's own BB gun in 3D, and a finish to make it theirs. */
export function GunStep() {
  const session = usePhone();
  const finish = usePhoneState((state) => state.finish);
  const colour = playerColor(session.seat);
  return (
    <StepShell
      steps={STEPS}
      current={1}
      title="Your BB gun"
      footer={
        <>
          <button type="button" className="btn btn--ghost btn--lg" onClick={() => session.goTo("calibrate")}>
            Recalibrate
          </button>
          <button type="button" className="btn btn--primary btn--lg kit-grow" onClick={() => session.goTo("ready")}>
            Next
          </button>
        </>
      }
    >
      <div className="sg-gun">
        <GunPreview finish={finish} colour={colour} />
        <p className="sg-gun__name">
          {FINISHES[finish].name} finish, with a laser in your colour
          <span className="sg-gun__swatch" style={{ background: colour }} />
        </p>
      </div>
      <div className="sg-finishes" role="radiogroup" aria-label="Finish">
        {FINISH_IDS.map((id) => {
          const look = FINISHES[id];
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={id === finish}
              className={`sg-finish ${id === finish ? "sg-finish--on" : ""}`}
              onClick={() => session.chooseFinish(id)}
            >
              <span className="sg-finish__chip" style={{ background: `linear-gradient(135deg, ${look.stock.color} 0 50%, ${look.metal.color} 50% 100%)` }} />
              {look.name}
            </button>
          );
        })}
      </div>
    </StepShell>
  );
}
