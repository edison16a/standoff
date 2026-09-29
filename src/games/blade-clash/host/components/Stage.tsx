"use client";
import { useBladeStore } from "../host-store";
import { CalibrationTargets } from "./CalibrationTargets";
import { ComputerLevel } from "./ComputerLevel";
import { DuelCanvas } from "./DuelCanvas";
import { HudBar } from "./HudBar";
import { PhaseBanner } from "./PhaseBanner";
import { PointMoment } from "./PointMoment";
import { TuningDrawer } from "./TuningDrawer";
import { Victory } from "./Victory";

/**
 * Blade Clash on one full screen, split down the middle: each player's
 * half looks over their own fighter's shoulder at the other. Players
 * appear as they pick fighters, calibration targets show in each half,
 * and the fight plays out on top. Once it is won the split gives way to
 * the winner's ceremony across the whole screen. The platform adds the
 * logo, the tool bar and the join code around it.
 */
export function Stage() {
  const tuningOpen = useBladeStore((state) => state.tuningOpen);
  const over = useBladeStore((state) => state.hud?.phase === "matchOver");
  return (
    <div className="stage">
      <DuelCanvas />
      {!over && <span className="stage__divider" aria-hidden="true" />}
      {!over && <HudBar />}
      <CalibrationTargets />
      <PhaseBanner />
      <PointMoment />
      <ComputerLevel />
      <Victory />
      {tuningOpen && <TuningDrawer onClose={() => useBladeStore.setState({ tuningOpen: false })} />}
    </div>
  );
}
