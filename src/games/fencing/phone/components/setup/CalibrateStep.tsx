"use client";
import { FencerPreview } from "@/games/fencing/components/FencerPreview";
import type { Slot } from "@/games/fencing/players";
import { useControllerStore } from "../../controller-store";
import { useController } from "../session-context";
import { HoldArt } from "./HoldArt";
import { LevelCapture } from "./LevelCapture";

export type CalibratePage = "hold" | "level" | "follow";

/**
 * Calibration, one page at a time. First how to hold the phone, then the
 * level that captures the guard by itself, then the fencer copying the
 * phone, so it is obvious it worked. Phones without motion sensors are
 * told they will fence with buttons instead.
 */
export function CalibrateStep({ slot, page, onPage }: { slot: Slot; page: CalibratePage; onPage(page: CalibratePage): void }) {
  const session = useController();
  const { sensorsLive, inputMode, pick } = useControllerStore();

  if (inputMode === "touch") {
    return (
      <div className="setup-page">
        <p className="setup-page__lead">No motion sensors here, so you fence with buttons.</p>
        <p className="setup-page__text">Jab and Parry sit under Forward and Back during a bout. Try them on the next page.</p>
      </div>
    );
  }

  if (page === "hold") {
    return (
      <div className="setup-page">
        <div className="setup-card setup-card--art">
          <HoldArt />
        </div>
        <p className="setup-page__lead">Hold your phone flat like a sword&apos;s handle, screen up.</p>
        <p className="setup-page__text">Point its top edge at the middle of the big screen and keep it there.</p>
        {!sensorsLive && (
          <button type="button" className="btn btn--ghost btn--block" onClick={() => session.useTouchControls()}>
            My phone has no motion sensors
          </button>
        )}
      </div>
    );
  }

  if (page === "level") {
    return (
      <div className="setup-page">
        <p className="setup-page__lead">Aim at the middle of the screen, flat and still.</p>
        <LevelCapture onCaptured={() => onPage("follow")} />
      </div>
    );
  }

  return (
    <div className="setup-page">
      <FencerPreview characterId={pick ?? "vale"} slot={slot} className="setup-card setup-card--fencer" framing="hero" sword={() => session.frame} />
      <p className="setup-page__lead">Now tilt your phone. Your sword follows.</p>
      <p className="setup-page__text">Up and down raises the blade. Left and right swings it.</p>
    </div>
  );
}
