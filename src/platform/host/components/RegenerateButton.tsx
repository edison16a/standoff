"use client";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Loader";
import { useHostStore } from "../host-store";
import { useHostRoom } from "./host-context";

/**
 * Regenerate room: a fresh connection and a new room for the same game,
 * with every phone that can still hear the old room moved over. It sits
 * right under the join code, and on the alert when a room is lost.
 */
export function RegenerateButton({ className = "join__regen" }: { className?: string }) {
  const host = useHostRoom();
  const fixing = useHostStore((state) => state.health === "fixing");
  return (
    <button type="button" className={className} disabled={fixing} onClick={() => host.regenerate()}>
      {fixing ? <Spinner /> : <Icon name="refresh" />}
      {fixing ? "Making a new room" : "Regenerate room"}
    </button>
  );
}
