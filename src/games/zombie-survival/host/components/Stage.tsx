"use client";
import { AimOverlay } from "@/games/kit/aim/AimOverlay";
import { storyBeat } from "../../engine/stages";
import { useSurvivalStore } from "../host-store";
import { Banners } from "./Banners";
import { CheckpointNote } from "./CheckpointNote";
import { EndCard } from "./EndCard";
import { Hud } from "./Hud";
import { LobbyPanel } from "./LobbyPanel";
import { PlayerChips } from "./PlayerChips";
import { RadioBox } from "./RadioBox";
import { useSession } from "./session-context";
import { Summary } from "./Summary";
import { Toasts } from "./Toasts";
import { ViewCanvas } from "./ViewCanvas";

/**
 * Zombie Survival on the big screen: the 3D view, with the lobby, HUD,
 * radio, achievements and summaries laid over it. The full summary card
 * waits for the story's big moments, so a checkpoint never stops play. The platform adds the
 * logo, the tool bar and the join code around it.
 */
export function Stage() {
  const session = useSession();
  const phase = useSurvivalStore((s) => s.hud.phase);
  const stage = useSurvivalStore((s) => s.hud.stage);
  const cinematic = phase === "cutscene";
  return (
    <div className={`zs-stage ${cinematic ? "zs-stage--cinematic" : ""}`}>
      <ViewCanvas />
      <div className="zs-vignette" aria-hidden="true" />
      <Banners />
      {phase === "lobby" ? <LobbyPanel /> : !cinematic && phase !== "escaped" && <Hud />}
      {phase !== "lobby" && !cinematic && phase !== "escaped" && <PlayerChips />}
      <RadioBox />
      <Toasts />
      <CheckpointNote />
      {phase === "clear" && storyBeat(stage) && <Summary />}
      {(phase === "down" || phase === "escaped") && <EndCard />}
      <AimOverlay aim={session.aim} players={() => [...session.players]} dots={false} />
    </div>
  );
}
