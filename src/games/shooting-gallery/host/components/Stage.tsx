"use client";
import { AimOverlay } from "@/games/kit/aim/AimOverlay";
import { IconButton } from "@/components/ui/IconButton";
import { Countdown } from "./Countdown";
import { GalleryCanvas } from "./GalleryCanvas";
import { LobbyPanel } from "./LobbyPanel";
import { Results } from "./Results";
import { Scoreboard } from "./Scoreboard";
import { useGallery, useHud } from "./session-context";

/**
 * The whole big screen: the booth in 3D, the calibration targets over it,
 * and the lobby, scoreboard, countdown and results laid on top. The
 * platform adds the logo, the tool bar and the join code around it.
 */
export function Stage() {
  const session = useGallery();
  return (
    <div className="sg-stage">
      <GalleryCanvas />
      {/* The guns draw their own lasers in 3D, so the overlay only shows calibration targets. */}
      <AimOverlay aim={session.aim} players={session.players} dots={false} />
      <Scoreboard />
      <Countdown />
      <LobbyPanel />
      <Results />
    </div>
  );
}

/** The gallery's button in the tool bar: music on or off. */
export function Tools() {
  const session = useGallery();
  const musicOn = useHud((state) => state.musicOn);
  return (
    <IconButton
      icon="volume"
      label={musicOn ? "Turn the music off" : "Turn the music on"}
      aria-pressed={musicOn}
      className={musicOn ? "" : "sg-muted"}
      onClick={() => session.toggleMusic()}
    />
  );
}
