"use client";
import { useFencingStore } from "../host-store";
import { MatchOver } from "./MatchOver";
import { PhaseBanner } from "./PhaseBanner";
import { PlayerBar } from "./PlayerBar";
import { StageCanvas } from "./StageCanvas";
import { TuningDrawer } from "./TuningDrawer";

/**
 * Fencing on one full screen stage. The strip is always there: players
 * appear on it as they pick fencers, the countdown starts on the same
 * picture, and the match and the result play out on top. The platform
 * adds the logo, the tool bar and the join code around it.
 */
export function Stage() {
  const tuningOpen = useFencingStore((state) => state.tuningOpen);
  return (
    <div className="stage">
      <StageCanvas />
      <PlayerBar />
      <PhaseBanner />
      <MatchOver />
      {tuningOpen && <TuningDrawer onClose={() => useFencingStore.setState({ tuningOpen: false })} />}
    </div>
  );
}
