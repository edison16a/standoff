"use client";
import { IconButton } from "@/components/ui/IconButton";
import { useSurvivalStore } from "../host-store";
import { useSession } from "./session-context";

/** Zombie Survival's button in the tool bar: end the run and go back to the lobby. */
export function Tools() {
  const session = useSession();
  const phase = useSurvivalStore((s) => s.hud.phase);
  if (phase === "lobby") return null;
  return <IconButton icon="leave" label="End the run" onClick={() => session.backToLobby()} />;
}
