"use client";
import { lazy, Suspense } from "react";
import { StepShell } from "@/games/kit/steps/StepShell";
import { CHARACTERS } from "../../characters";
import { findTrack } from "../../tracks";
import { useControllerStore } from "../controller-store";
import { CalibrateStep } from "./CalibrateStep";
import { KartStep } from "./KartStep";
import { useController } from "./session-context";

const Preview = lazy(() => import("./KartPreviewCanvas"));

const STEPS = ["Calibrate", "Kart", "Ready"] as const;
const INDEX = { calibrate: 0, kart: 1, ready: 2 } as const;
const TITLES = { calibrate: "Hold it like a wheel", kart: "Pick your driver", ready: "Ready to race" } as const;

function ReadyStep() {
  const host = useControllerStore((state) => state.host);
  if (!host || !host.pick) return null;
  const character = CHARACTERS[host.pick];
  const raceOn = host.phase !== "lobby" && !host.racing;
  const note = raceOn
    ? "A race is on right now. You join the next one."
    : host.ready
      ? "You are in. The race starts from the big screen."
      : "Tap Ready. The map is picked on the big screen.";
  return (
    <div className="mk-ready" style={{ "--kart": character.color } as React.CSSProperties}>
      <div className="mk-ready__stage">
        <Suspense fallback={null}>
          <Preview character={host.pick} />
        </Suspense>
      </div>
      <div className="mk-ready__card">
        <span className="mk-ready__swatch" />
        <div>
          <strong>
            {character.name} in the {character.kart}
          </strong>
          <span className="muted">Map: {findTrack(host.map).name}</span>
        </div>
      </div>
      <p className={`mk-ready__note ${host.ready ? "mk-ready__note--on" : ""}`}>{note}</p>
    </div>
  );
}

/**
 * The phone's setup, one step per page in the kit's frame: calibrate the
 * tilt, pick a driver, then say ready. The platform already asked for a
 * name before this.
 */
export function Setup() {
  const session = useController();
  const { step, calibrated, host } = useControllerStore();
  const confirmed = host?.pick ?? null;
  const ready = host?.ready ?? false;

  const footer =
    step === "calibrate" ? (
      <button type="button" className="btn btn--primary btn--lg kit-grow" disabled={!calibrated} onClick={() => session.goTo("kart")}>
        Next
      </button>
    ) : step === "kart" ? (
      <>
        <button type="button" className="btn btn--ghost btn--lg" onClick={() => session.goTo("calibrate")}>
          Back
        </button>
        <button type="button" className="btn btn--primary btn--lg kit-grow" disabled={!confirmed} onClick={() => session.goTo("ready")}>
          Next
        </button>
      </>
    ) : (
      <>
        <button type="button" className="btn btn--ghost btn--lg" disabled={ready} onClick={() => session.goTo("kart")}>
          Back
        </button>
        <button type="button" className={`btn btn--lg kit-grow ${ready ? "btn--ghost" : "btn--primary"}`} disabled={!confirmed} onClick={() => session.setReady(!ready)}>
          {ready ? "Not ready" : "Ready"}
        </button>
      </>
    );

  return (
    <StepShell steps={STEPS} current={INDEX[step]} title={TITLES[step]} footer={footer}>
      {step === "calibrate" && <CalibrateStep />}
      {step === "kart" && <KartStep />}
      {step === "ready" && <ReadyStep />}
    </StepShell>
  );
}
