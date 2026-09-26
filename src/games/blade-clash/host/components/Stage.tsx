"use client";
import { useBladeStore } from "../host-store";
import { CalibrationTargets } from "./CalibrationTargets";
import { DuelCanvas } from "./DuelCanvas";
import { HudBar } from "./HudBar";
import { MatchOver } from "./MatchOver";
import { PhaseBanner } from "./PhaseBanner";
import { TuningDrawer } from "./TuningDrawer";

/**
 * Blade Clash on one full screen, split down the middle: each player's
 * half looks over their own fighter's shoulder at the other. Players
 * appear as they pick fighters, calibration targets show in each half,
 * and the fight and the result play out on top. The platform adds the
 * logo, the tool bar and the join code around it.
 */
export function Stage() {
  const tuningOpen = useBladeStore((state) => state.tuningOpen);
  return (
    <div className="stage">
      <DuelCanvas />
      <span className="stage__divider" aria-hidden="true" />
      <HudBar />
      <CalibrationTargets />
      <PhaseBanner />
      <MatchOver />
      {tuningOpen && <TuningDrawer onClose={() => useBladeStore.setState({ tuningOpen: false })} />}
    </div>
  );
}
