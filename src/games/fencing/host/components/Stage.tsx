"use client";
import { useRef, useState } from "react";
import { GitHubButton } from "@/components/ui/GitHubButton";
import { IconButton } from "@/components/ui/IconButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useHostStore } from "../host-store";
import { useSession } from "../../../../platform/host/components/session-context";
import { JoinPanel } from "./JoinPanel";
import { MatchOver } from "./MatchOver";
import { PhaseBanner } from "./PhaseBanner";
import { PlayerBar } from "./PlayerBar";
import { StageCanvas } from "./StageCanvas";
import { TuningDrawer } from "./TuningDrawer";

/**
 * The whole game on one full screen stage. The strip is always there:
 * players appear on it as they pick fencers, the countdown starts on the
 * same picture, and the match and the result play out on top.
 */
export function Stage() {
  const session = useSession();
  const rootRef = useRef<HTMLDivElement>(null);
  const [tuning, setTuning] = useState(false);
  const status = useHostStore((state) => state.status);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.();
  };

  return (
    <div ref={rootRef} className="stage">
      <StageCanvas />
      <PlayerBar />
      <div className="stage__tools">
        <IconButton icon="sliders" label="Tuning" onClick={() => setTuning((open) => !open)} />
        <ThemeToggle />
        <IconButton icon="expand" label="Full screen" onClick={toggleFullscreen} />
        <GitHubButton compact />
        <IconButton icon="leave" label="End game" onClick={() => session.endGame()} />
      </div>
      <JoinPanel />
      <PhaseBanner />
      <MatchOver />
      {status !== "open" && <p className="stage__notice">Reconnecting</p>}
      {tuning && <TuningDrawer onClose={() => setTuning(false)} />}
    </div>
  );
}
