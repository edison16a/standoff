"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { buildCalibration, CORNER_TARGETS, DEFAULT_GUARD, type Corner } from "@/games/blade-clash/motion/sword-aim";
import type { Slot } from "@/games/blade-clash/players";
import type { CalibrationStep } from "@/games/blade-clash/protocol";
import type { Quat } from "@/games/kit/motion/math3d";
import { playerColor } from "@/games/kit/players";
import { StepShell } from "@/games/kit/steps/StepShell";
import { useControllerStore } from "../../controller-store";
import { SwordGauge } from "../SwordGauge";
import { useController } from "../session-context";
import { HoldArt } from "./HoldArt";
import { TargetCapture } from "./TargetCapture";

type Page = "hold" | "center" | Corner | "guard" | "test";

const CORNERS: readonly Corner[] = ["top-left", "top-right", "bottom-right", "bottom-left"];
const ORDER: readonly Page[] = ["hold", "center", ...CORNERS, "guard", "test"];

const TITLES: Record<Page, string> = {
  hold: "Hold it like a sword",
  center: "Point at the middle",
  "top-left": "Top left corner",
  "top-right": "Top right corner",
  "bottom-right": "Bottom right corner",
  "bottom-left": "Bottom left corner",
  guard: "Show your guard",
  test: "Your sword follows",
};

/**
 * Calibration, one page at a time: how to hold the phone, then a target
 * in the middle of the player's half of the big screen and one in each
 * corner, then their relaxed guard. From those the phone learns how far
 * this player turns to reach every part of their view, so the sword can
 * too. Last, the sword copying the phone, so it is plain it worked.
 */
export function CalibrateStep({ slot, steps, onDone }: { slot: Slot; steps: readonly string[]; onDone(): void }) {
  const session = useController();
  const { sensorsLive, inputMode, calibrated } = useControllerStore();
  const [page, setPage] = useState<Page>(calibrated ? "test" : "hold");
  const reads = useRef<{ center: Quat | null; corners: Partial<Record<Corner, Quat>> }>({ center: null, corners: {} });
  const colour = playerColor(slot);
  const touch = inputMode === "touch";

  useEffect(() => {
    session.showStep((page === "hold" ? "center" : page) as CalibrationStep);
  }, [page, session]);

  const finish = (guard: Quat | null) => {
    const { center, corners } = reads.current;
    if (center) session.setCalibration(buildCalibration(center, corners, guard));
    setPage("test");
  };
  const capture = (q: Quat) => {
    if (page === "center") reads.current = { center: q, corners: {} };
    else if (page === "guard") return finish(q);
    else if (page !== "hold" && page !== "test") reads.current.corners[page] = q;
    setPage(ORDER[ORDER.indexOf(page) + 1] ?? "test");
  };
  const done = () => {
    session.showStep("done");
    onDone();
  };

  if (touch) {
    return (
      <StepShell steps={steps} current={0} title="Drag to swing" footer={<Next onClick={done} />}>
        <div className="setup-page">
          <p className="setup-page__lead">No motion sensors here, so you swing with your finger.</p>
          <p className="setup-page__text">During a fight, drag on the pad to point your sword. Let go to rest in guard.</p>
        </div>
      </StepShell>
    );
  }

  const back = <button type="button" className="btn btn--ghost btn--lg" onClick={() => setPage("hold")}>Back</button>;
  const footers: Partial<Record<Page, ReactNode>> = {
    hold: <Next disabled={!sensorsLive} onClick={() => setPage("center")} />,
    center: back,
    guard: back,
    test: (
      <>
        <button type="button" className="btn btn--ghost btn--lg" onClick={() => setPage("center")}>
          Redo
        </button>
        <Next onClick={done} />
      </>
    ),
  };
  const cornerFooter = (
    <>
      {back}
      <button type="button" className="btn btn--ghost btn--lg kit-grow" onClick={() => setPage("guard")}>
        Skip corners
      </button>
    </>
  );

  return (
    <StepShell steps={steps} current={0} title={TITLES[page]} footer={footers[page] ?? cornerFooter}>
      <div className="setup-page">
        {page === "hold" && (
          <>
            <div className="setup-card setup-card--art">
              <HoldArt />
            </div>
            <p className="setup-page__lead">Hold your phone like the handle of a sword.</p>
            <p className="setup-page__text">Point its top edge at your side of the big screen. Then point where each page asks and hold still.</p>
            {!sensorsLive && (
              <button type="button" className="btn btn--ghost btn--block" onClick={() => session.useTouchControls()}>
                My phone has no motion sensors
              </button>
            )}
          </>
        )}
        {page !== "hold" && page !== "test" && (
          <TargetCapture key={page} slot={slot} colour={colour} target={page === "center" ? { x: 0, y: 0 } : page === "guard" ? DEFAULT_GUARD : CORNER_TARGETS[page]} onCaptured={capture} />
        )}
        {page === "guard" && <p className="setup-page__text">Hold the sword the way you rest between swings, tip a little low, elbow bent.</p>}
        {page === "test" && (
          <>
            <SwordGauge colour={colour} className="setup-card setup-card--gauge" />
            <p className="setup-page__lead">Point anywhere on your side. The sword goes there.</p>
            <p className="setup-page__text">Point at your opponent to stretch your arm for a thrust.</p>
          </>
        )}
      </div>
    </StepShell>
  );
}

function Next({ onClick, disabled = false }: { onClick(): void; disabled?: boolean }) {
  return (
    <button type="button" className="btn btn--primary btn--lg kit-grow" disabled={disabled} onClick={onClick}>
      Next
    </button>
  );
}
