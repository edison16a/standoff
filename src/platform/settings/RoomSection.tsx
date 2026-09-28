"use client";
import { useContext, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { HostContext } from "@/platform/host/components/host-context";
import { useHostStore } from "@/platform/host/host-store";

const REMAKE_WAIT_MS = 6000;

/**
 * Remake lobby, shown only while a room is open. It opens a fresh room for
 * the same game and moves every phone to it. If phones say "Room not
 * found" while the big screen still shows a code, this gets everyone back
 * together without anyone typing a new code.
 */
export function RoomSection() {
  const host = useContext(HostContext);
  const room = useHostStore((state) => state.room);
  const online = useHostStore((state) => state.status === "open");
  const [asked, setAsked] = useState<string | null>(null);
  // A refused remake leaves the code as it was, so the button frees itself after a while.
  useEffect(() => {
    if (!asked) return;
    const timer = setTimeout(() => setAsked(null), REMAKE_WAIT_MS);
    return () => clearTimeout(timer);
  }, [asked]);
  if (!host || !room) return null;
  // The button waits while its request is out. A new code means it landed.
  const busy = asked === room.code;

  return (
    <>
      <p className="settings__title">
        <Icon name="users" />
        Room {room.code}
      </p>
      <button
        type="button"
        className="btn btn--block"
        disabled={!online || busy}
        onClick={() => {
          setAsked(room.code);
          host.remake();
        }}
      >
        <Icon name="refresh" />
        {busy ? "Remaking lobby" : "Remake lobby"}
      </button>
      <span className="settings__hint">Opens a new room and moves every phone to it.</span>
    </>
  );
}
