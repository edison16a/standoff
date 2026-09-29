"use client";
import "./aim.css";
import "../kit.css";
import { useEffect, useState, useSyncExternalStore } from "react";
import { sameZone, WHOLE_SCREEN, type AimZone, type Pointing } from "./aim-math";
import { AIM_PLANS, type AimPlan } from "./aim-targets";
import { AimPad } from "./AimPad";
import { targetCopy, TEST_COPY, touchCopy } from "./calibrate-copy";
import { HoldTarget } from "./HoldTarget";
import { toPixels } from "./host-aim";
import type { PhoneAim } from "./phone-aim";
import { ZoneFrame, zoneBox } from "./PointGuide";

/** How long a taken target shows green before the next one appears. */
const GREEN_MS = 450;

interface AimCalibrateProps {
  aim: PhoneAim;
  /** The player's colour, for the target in the picture. */
  colour: string;
  /**
   * How many targets to take. "shooter" (the default) takes five: the
   * middle and every corner. "sword" takes six, every corner and the middle
   * twice, for games that swing all over the screen.
   */
  plan?: AimPlan;
  /**
   * For games with a view per player: the part of the big screen this
   * player aims inside, as fractions from the top left. The host must give
   * HostAim the same zone. Leave it out to aim at the whole screen.
   */
  zone?: AimZone;
  onDone(): void;
}

/**
 * The calibration page for every aiming game, hold to calibrate. Targets
 * appear on the big screen and the phone in turn. The player points at
 * each and holds still; a ring fills, turns green, and the next target
 * comes up on its own. Those readings teach the phone how far this player
 * turns to cross the screen from where they sit. Then a test view shows
 * the aim live before moving on. Phones without sensors get a drag pad.
 */
export function AimCalibrate({ aim, colour, plan = "shooter", zone: given, onDone }: AimCalibrateProps) {
  // A zone that is the whole screen is no zone: the big screen draws no outline for it, so neither do the words.
  const zone = given && !sameZone(given, WHOLE_SCREEN) ? given : undefined;
  const targets = AIM_PLANS[plan];
  const snapshot = useSyncExternalStore(aim.subscribe, aim.getSnapshot, aim.getSnapshot);
  const touch = snapshot.source === "touch";
  const [index, setIndex] = useState(0);
  const [taken, setTaken] = useState(false);
  const [last, setLast] = useState<Pointing | null>(null);
  const testing = touch || index >= targets.length;
  const target = testing ? null : targets[index]!;

  // Setting the same zone again is harmless, so a fresh object each render needs no care.
  useEffect(() => aim.setZone(zone ?? null), [aim, zone]);

  useEffect(() => {
    aim.announce(target ?? "test");
    aim.stream(target === null);
  }, [aim, target]);

  // Leaving the page any way at all, Back included, clears this player's
  // target from the big screen, so it never lingers into play.
  useEffect(() => () => aim.announce("done"), [aim]);

  // A taken target shows green for a moment, then the next one comes up by itself.
  useEffect(() => {
    if (!taken) return;
    const timer = setTimeout(() => {
      setTaken(false);
      setIndex((i) => i + 1);
    }, GREEN_MS);
    return () => clearTimeout(timer);
  }, [taken]);

  const held = () => {
    if (!target) return;
    const reading = aim.pointing;
    if (!aim.capture(target, index === targets.length - 1)) return;
    setLast(reading);
    setTaken(true);
  };

  const restart = () => {
    aim.restartCalibration();
    setLast(null);
    setTaken(false);
    setIndex(0);
  };

  const finish = () => {
    aim.announce("done");
    onDone();
  };

  const copy = target ? targetCopy(target, index, zone !== undefined) : { title: touch ? "Aim by dragging" : TEST_COPY.title, text: touch ? touchCopy(zone !== undefined) : TEST_COPY.text(zone !== undefined) };
  return (
    <div className="kit-calibrate">
      <h3 className="kit-calibrate__title">{copy.title}</h3>
      <p className="kit-calibrate__text">{copy.text}</p>
      {target ? (
        <HoldTarget key={index} aim={aim} target={target} colour={colour} zone={zone} after={last} count={`${index + 1} of ${targets.length}`} onHeld={held} />
      ) : touch ? (
        <AimPad aim={aim} />
      ) : (
        <MiniScreen point={snapshot.point} colour={colour} zone={zone} />
      )}
      <div className="kit-calibrate__actions">
        {testing ? (
          <>
            {!touch && (
              <button type="button" className="btn btn--ghost btn--lg" onClick={restart}>
                Redo
              </button>
            )}
            <button type="button" className="btn btn--primary btn--lg kit-grow" onClick={finish}>
              {TEST_COPY.button}
            </button>
          </>
        ) : (
          index > 0 && (
            <>
              <button type="button" className="btn btn--ghost btn--lg" onClick={restart}>
                Start over
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--lg kit-grow"
                onClick={() => {
                  aim.useQuick();
                  setIndex(targets.length);
                }}
              >
                Skip the rest
              </button>
            </>
          )
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
