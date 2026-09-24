"use client";
import { useRef } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useSession } from "../session-context";
import { MatchCanvas } from "./MatchCanvas";
import { MatchOver } from "./MatchOver";
import { PhaseBanner } from "./PhaseBanner";
import { ReplayBar } from "./ReplayBar";
import { Scoreboard } from "./Scoreboard";

/** The full screen strip with the scoreboard and calls floating over it. */
export function MatchScreen() {
  const session = useSession();
  const rootRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.();
  };

  return (
    <div ref={rootRef} className="match">
      <MatchCanvas />
      <div className="match__top">
        <Scoreboard />
      </div>
      <div className="match__tools">
        <ThemeToggle />
        <IconButton icon="expand" label="Full screen" onClick={toggleFullscreen} />
        <IconButton icon="leave" label="End game" onClick={() => session.endGame()} />
      </div>
      <PhaseBanner />
      <ReplayBar />
      <MatchOver />
    </div>
  );
}
