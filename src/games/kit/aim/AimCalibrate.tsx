"use client";
import "./aim.css";
import "../kit.css";
import { useEffect, useState, useSyncExternalStore } from "react";
import { sameZone, WHOLE_SCREEN, type AimZone } from "./aim-math";
import { toPixels } from "./host-aim";
import { AimPad } from "./AimPad";
import type { PhoneAim } from "./phone-aim";
import { PointGuide, ZoneFrame, zoneBox } from "./PointGuide";
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

/** The same steps, worded for a player who aims inside their own part of the screen. */
const ZONE_COPY: Record<Stage, { title: string; text: string }> = {
  center: {
    title: "Point at the middle of your view",
    text: "Your view is outlined in your colour on the big screen. Hold your phone flat like a remote, point its top edge at the target in the middle of it, hold still and tap Set.",
  },
  "top-left": { title: "Now its top left", text: "Point the top edge at the target near the top left corner of your view. Tap Set." },
  "bottom-right": { title: "Last, its bottom right", text: "Point at the target near the bottom right corner of your view. Tap Set." },
  test: { title: "Try it", text: "Move the phone around. Your dot in your view, and the one below, should follow where you point." },
};

interface AimCalibrateProps {
  aim: PhoneAim;
  /** The player's colour, for the target in the picture. */
  colour: string;
  /**
   * For games with a view per player: the part of the big screen this
   * player aims inside, as fractions from the top left. The host must give
   * HostAim the same zone. Leave it out to aim at the whole screen.
   */
  zone?: AimZone;
  onDone(): void;
}

/**
 * The calibration page for every aiming game. Three targets appear on the
 * big screen in turn (middle, top left, bottom right). Pointing at each
 * one teaches the phone how far this player turns to cross the screen
 * from where they sit. Then a test view shows the aim live before moving
 * on. Phones without sensors skip straight to a drag pad.
 */
export function AimCalibrate({ aim, colour, zone: given, onDone }: AimCalibrateProps) {
  // A zone that is the whole screen is no zone: the big screen draws no outline for it, so neither do the words.
  const zone = given && !sameZone(given, WHOLE_SCREEN) ? given : undefined;
  const snapshot = useSyncExternalStore(aim.subscribe, aim.getSnapshot, aim.getSnapshot);
  const touch = snapshot.source === "touch";
  const [stage, setStage] = useState<Stage>("center");
  const current: Stage = touch ? "test" : stage;

  // Setting the same zone again is harmless, so a fresh object each render needs no care.
  useEffect(() => aim.setZone(zone ?? null), [aim, zone]);

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

  const copy = zone ? { ...COPY[current], ...ZONE_COPY[current] } : COPY[current];
  return (
    <div className="kit-calibrate">
      <h3 className="kit-calibrate__title">{touch ? "Aim by dragging" : copy.title}</h3>
      <p className="kit-calibrate__text">
        {touch ? `This phone has no motion sensors, so drag on the pad to move your dot ${zone ? "in your view" : "on the big screen"}.` : copy.text}
      </p>
      {current === "test" ? (
        touch ? (
          <AimPad aim={aim} />
        ) : (
          <MiniScreen point={snapshot.point} colour={colour} zone={zone} />
        )
      ) : (
        <PointGuide step={current} colour={colour} zone={zone} />
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

/** The big screen in miniature, with this phone's dot on it, inside the player's zone if they have one. */
function MiniScreen({ point, colour, zone }: { point: { x: number; y: number }; colour: string; zone?: AimZone }) {
  const box = zone ? zoneBox(zone) : { x: 20, y: 10, w: 200, h: 112 };
  const at = toPixels({ x: Math.max(-1, Math.min(1, point.x)), y: Math.max(-1, Math.min(1, point.y)) }, box.w, box.h);
  return (
    <svg className="kit-guide" viewBox="0 0 240 150" role="img" aria-label={zone ? "Your aim in your view" : "Your aim on the big screen"}>
      <rect x="20" y="10" width="200" height="112" rx="10" className="kit-guide__screen" />
      {zone && <ZoneFrame zone={zone} colour={colour} />}
      <circle cx={box.x + at.x} cy={box.y + at.y} r="9" fill="none" stroke={colour} strokeWidth="3" />
      <circle cx={box.x + at.x} cy={box.y + at.y} r="3.5" fill={colour} />
    </svg>
  );
}
