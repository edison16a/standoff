"use client";
import "./aim.css";
import "../kit.css";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toPixels } from "./host-aim";
import { AimPad } from "./AimPad";
import type { PhoneAim } from "./phone-aim";
import { PointGuide } from "./PointGuide";
import type { AimStep } from "./protocol";

type Stage = "center" | "top-left" | "bottom-right" | "test";

const COPY: Record<Stage, { title: string; text: string; button: string }> = {
  center: {
    title: "Point at the middle",
    text: "Hold your phone flat like a remote, top edge toward the big screen. Point it at the target in the middle, hold still and tap Set.",
    button: "Set middle",
  },
  "top-left": {
    title: "Now the top left",
    text: "Keep the phone flat and point its top edge at the target near the top left corner. Tap Set.",
    button: "Set top left",
  },
  "bottom-right": {
    title: "Last, the bottom right",
    text: "Point at the target near the bottom right corner. Tap Set.",
    button: "Set bottom right",
  },
  test: {
    title: "Try it",
    text: "Move the phone around. Your dot on the big screen, and the one below, should follow where you point.",
    button: "Looks good",
  },
};

interface AimCalibrateProps {
  aim: PhoneAim;
  /** The player's colour, for the target in the picture. */
  colour: string;
  onDone(): void;
}

/**
 * The calibration page for every aiming game. Three targets appear on the
 * big screen in turn (middle, top left, bottom right). Pointing at each
 * one teaches the phone how far this player turns to cross the screen
 * from where they sit. Then a test view shows the aim live before moving
 * on. Phones without sensors skip straight to a drag pad.
 */
export function AimCalibrate({ aim, colour, onDone }: AimCalibrateProps) {
  const snapshot = useSyncExternalStore(aim.subscribe, aim.getSnapshot, aim.getSnapshot);
  const touch = snapshot.source === "touch";
  const [stage, setStage] = useState<Stage>("center");
  const current: Stage = touch ? "test" : stage;

  useEffect(() => {
    aim.announce(current as AimStep);
    aim.stream(current === "test");
  }, [aim, current]);

  // Leaving the page any way at all, Back included, clears this player's
  // target from the big screen, so it never lingers into play.
  useEffect(() => () => aim.announce("done"), [aim]);

  const set = () => {
    if (current === "center" && aim.setCenter()) setStage("top-left");
    else if (current === "top-left" && aim.setCorner("top-left")) setStage("bottom-right");
    else if (current === "bottom-right" && aim.setCorner("bottom-right")) setStage("test");
  };

  const finish = () => {
    aim.announce("done");
    onDone();
  };

  const copy = COPY[current];
  return (
    <div className="kit-calibrate">
      <h3 className="kit-calibrate__title">{touch ? "Aim by dragging" : copy.title}</h3>
      <p className="kit-calibrate__text">
        {touch ? "This phone has no motion sensors, so drag on the pad to move your dot on the big screen." : copy.text}
      </p>
      {current === "test" ? (
        touch ? (
          <AimPad aim={aim} />
        ) : (
          <MiniScreen point={snapshot.point} colour={colour} />
        )
      ) : (
        <PointGuide step={current} colour={colour} />
      )}
      <div className="kit-calibrate__actions">
        {current === "test" ? (
          <>
            {!touch && (
              <button type="button" className="btn btn--ghost btn--lg" onClick={() => setStage("center")}>
                Redo
              </button>
            )}
            <button type="button" className="btn btn--primary btn--lg kit-grow" onClick={finish}>
              {copy.button}
            </button>
          </>
        ) : (
          <>
            {current !== "center" && (
              <button
                type="button"
                className="btn btn--ghost btn--lg"
                onClick={() => {
                  aim.useQuick();
                  setStage("test");
                }}
              >
                Skip corners
              </button>
            )}
            <button type="button" className="btn btn--primary btn--lg kit-grow" onClick={set} disabled={!snapshot.ready}>
              {snapshot.ready ? copy.button : "Waiting for sensors"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** The big screen in miniature, with this phone's dot on it. */
function MiniScreen({ point, colour }: { point: { x: number; y: number }; colour: string }) {
  const at = toPixels({ x: Math.max(-1, Math.min(1, point.x)), y: Math.max(-1, Math.min(1, point.y)) }, 200, 112);
  return (
    <svg className="kit-guide" viewBox="0 0 240 150" role="img" aria-label="Your aim on the big screen">
      <rect x="20" y="10" width="200" height="112" rx="10" className="kit-guide__screen" />
      <circle cx={20 + at.x} cy={10 + at.y} r="9" fill="none" stroke={colour} strokeWidth="3" />
      <circle cx={20 + at.x} cy={10 + at.y} r="3.5" fill={colour} />
    </svg>
  );
}
