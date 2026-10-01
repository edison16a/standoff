"use client";
import "./aim.css";
import "./look/calibrate.css";
import "../kit.css";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { StepShell } from "@/games/kit/steps/StepShell";
import { sameZone, WHOLE_SCREEN, type AimZone, type Pointing } from "./aim-math";
import { AIM_PLANS, type AimPlan } from "./aim-targets";
import { AimPad } from "./AimPad";
import { HOLD_COPY, targetTitle, TEST_COPY, TOUCH_COPY } from "./calibrate-copy";
import { HoldTarget } from "./HoldTarget";
import { HoldArt } from "./look/HoldArt";
import { LiveDot } from "./look/TvPicture";
import type { PhoneAim } from "./phone-aim";

/** How long a taken target shows before the next one appears. */
const GREEN_MS = 450;

interface AimCalibrateProps {
  aim: PhoneAim;
  /** The player's colour, for their part of the screen and the target in the pictures. */
  colour: string;
  /** The game's setup steps, for the step track at the top, and which one this is (0 by default). */
  steps: readonly string[];
  current?: number;
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

/** The grip, then each target, then the check that the aim follows. */
type Page = "hold" | number | "test";

/**
 * The calibration step for every aiming game, in the look Blade Clash
 * first had: a page on how to hold the phone, then a page per target.
 * Targets appear on the big screen and the phone in turn; the player
 * points at each and holds still, a ring fills, and the next comes up by
 * itself. Those readings teach the phone how far this player turns to
 * cross the screen from where they sit. Last, the aim live, to check it.
 * Phones without sensors get a drag pad instead.
 */
export function AimCalibrate({ aim, colour, steps, current = 0, plan = "shooter", zone: given, onDone }: AimCalibrateProps) {
  // A zone that is the whole screen is no zone: the big screen draws no outline for it, so neither do the words.
  const zone = given && !sameZone(given, WHOLE_SCREEN) ? given : undefined;
  const targets = AIM_PLANS[plan];
  const snapshot = useSyncExternalStore(aim.subscribe, aim.getSnapshot, aim.getSnapshot);
  const touch = snapshot.source === "touch";
  const [page, setPage] = useState<Page>("hold");
  const [taken, setTaken] = useState(false);
  const [last, setLast] = useState<Pointing | null>(null);
  const index = typeof page === "number" ? page : -1;
  const target = touch || page === "test" ? null : targets[Math.max(0, index)]!;

  // Setting the same zone again is harmless, so a fresh object each render needs no care.
  useEffect(() => aim.setZone(zone ?? null), [aim, zone]);

  // The grip page already shows the first target on the big screen, so the player can find it while reading.
  useEffect(() => {
    aim.announce(target ?? "test");
    aim.stream(target === null);
  }, [aim, target]);

  // Leaving the page any way at all clears this player's target from the big screen, so it never lingers into play.
  useEffect(() => () => aim.announce("done"), [aim]);

  // A taken target shows for a moment, then the next one comes up by itself.
  useEffect(() => {
    if (!taken) return;
    const timer = setTimeout(() => {
      setTaken(false);
      setPage((p) => (typeof p === "number" && p + 1 < targets.length ? p + 1 : "test"));
    }, GREEN_MS);
    return () => clearTimeout(timer);
  }, [taken, targets.length]);

  const held = () => {
    if (!target) return;
    const reading = aim.pointing;
    if (!aim.capture(target, index === targets.length - 1)) return;
    setLast(reading);
    setTaken(true);
  };
  const restart = (to: Page) => {
    aim.restartCalibration();
    setLast(null);
    setTaken(false);
    setPage(to);
  };
  const finish = () => {
    aim.announce("done");
    onDone();
  };

  const zoned = zone !== undefined;
  const ghost = (label: string, onClick: () => void, grow = false) => (
    <button type="button" className={`btn btn--ghost btn--lg ${grow ? "kit-grow" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
  const primary = (label: string, onClick: () => void, disabled = false) => (
    <button type="button" className="btn btn--primary btn--lg kit-grow" disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );

  let title: string;
  let body: ReactNode;
  let footer: ReactNode;
  if (touch) {
    title = TOUCH_COPY.title;
    body = (
      <>
        <p className="kit-cal__lead">{TOUCH_COPY.lead}</p>
        <p className="kit-cal__text">{TOUCH_COPY.text(zoned)}</p>
        <AimPad aim={aim} />
      </>
    );
    footer = primary(TEST_COPY.button, finish);
  } else if (page === "hold") {
    title = HOLD_COPY.title;
    body = (
      <>
        <div className="kit-cal__card">
          <HoldArt zone={zone} colour={colour} />
        </div>
        <p className="kit-cal__lead">{HOLD_COPY.lead}</p>
        <p className="kit-cal__text">{snapshot.ready ? HOLD_COPY.text(zoned) : "Waiting for the motion sensors."}</p>
      </>
    );
    footer = primary("Next", () => restart(0), !snapshot.ready);
  } else if (page === "test") {
    title = TEST_COPY.title;
    body = (
      <>
        <LiveDot point={snapshot.point} zone={zone ?? WHOLE_SCREEN} colour={colour} />
        <p className="kit-cal__lead">{TEST_COPY.lead(zoned)}</p>
        <p className="kit-cal__text">{TEST_COPY.text}</p>
      </>
    );
    footer = (
      <>
        {ghost("Redo", () => restart(0))}
        {primary(TEST_COPY.button, finish)}
      </>
    );
  } else {
    title = targetTitle(target!, index);
    body = <HoldTarget key={index} aim={aim} target={target!} colour={colour} zone={zone} after={last} count={`${index + 1} of ${targets.length}`} onHeld={held} />;
    // Skipping reuses the spans this phone measured last time, so it needs the middle taken first.
    const skip = () => {
      aim.useQuick();
      setPage("test");
    };
    footer = (
      <>
        {ghost("Back", () => restart("hold"))}
        {index > 0 && !taken && ghost("Skip the rest", skip, true)}
      </>
    );
  }

  return (
    <StepShell steps={steps} current={current} title={title} footer={footer}>
      <div className="kit-cal">{body}</div>
    </StepShell>
  );
}
