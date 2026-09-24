"use client";
import { useRef, useState } from "react";
import { GitHubButton } from "@/components/ui/GitHubButton";
import { IconButton } from "@/components/ui/IconButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useHostStore } from "../../host-store";
import { useSession } from "../session-context";
import { JoinPanel } from "./JoinPanel";
import { MatchOver } from "./MatchOver";
import { PhaseBanner } from "./PhaseBanner";
import { PlayerBar } from "./PlayerBar";
import { ReplayBar } from "./ReplayBar";
import { StageCanvas } from "./StageCanvas";
import { TuningDrawer } from "./TuningDrawer";

/**
 * The whole game on one full screen stage. The strip is always there:
 * players appear on it as they pick fencers, the countdown starts on the
 * same picture, and the match, replays and the result play out on top.
 */
export function Stage() {
  const session = useSession();
  const rootRef = useRef<HTMLDivElement>(null);
  const [tuning, setTuning] = useState(false);
  const status = useHostStore((state) => state.status);
  const sharedRooms = useHostStore((state) => state.sharedRooms);

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
      <ReplayBar />
      <MatchOver />
      {(status !== "open" || !sharedRooms) && (
        <p className="stage__notice">{status !== "open" ? "Reconnecting" : "No shared room store. Add Redis to this deployment."}</p>
      )}
      {tuning && <TuningDrawer onClose={() => setTuning(false)} />}
    </div>
  );
}
