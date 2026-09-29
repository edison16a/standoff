"use client";
import { useContext } from "react";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Loader";
import { HostContext } from "@/platform/host/components/host-context";
import { useHostStore, type RoomHealth } from "@/platform/host/host-store";

const CHECK: Record<RoomHealth, string> = {
  idle: "not started",
  checking: "running",
  ok: "passed",
  fixing: "making a new room",
  lost: "failed",
};

/**
 * Remake lobby, shown only while a room is open. It is the same full
 * remake as Regenerate room under the QR code: a fresh connection and a
 * new room for the same game, with every phone that can still hear the old
 * room moved to it, names and all.
 */
export function RoomSection() {
  const host = useContext(HostContext);
  const room = useHostStore((state) => state.room);
  const health = useHostStore((state) => state.health);
  if (!host || !room) return null;
  const busy = health === "fixing";

  return (
    <>
      <p className="settings__title">
        <Icon name="users" />
        Room {room.code}
      </p>
      <button type="button" className="btn btn--block" disabled={busy} onClick={() => host.regenerate()}>
        {busy ? <Spinner /> : <Icon name="refresh" />}
        {busy ? "Making a new room" : "Remake lobby"}
      </button>
      <span className="settings__hint">Opens a new room and moves every phone to it.</span>
      <span className="settings__hint">Room check: {CHECK[health]}</span>
    </>
  );
}
