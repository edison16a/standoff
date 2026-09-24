"use client";
import { useEffect, useState } from "react";
import { HostRoom } from "../host-room";
import { useHostStore } from "../host-store";
import { Home } from "./Home";
import { HostContext } from "./host-context";
import { RoomShell } from "./RoomShell";

/** The computer's side of Standoff: pick a game on the home screen, then host it. */
export function HostApp() {
  // This component only renders in the browser (see HostEntry), so the host can be made up front.
  const [host] = useState(() => new HostRoom());
  const screen = useHostStore((state) => state.screen);
  const code = useHostStore((state) => state.room?.code);

  useEffect(() => {
    host.connect();
    return () => host.dispose();
  }, [host]);

  return (
    <HostContext.Provider value={host}>{screen === "room" && code ? <RoomShell key={code} /> : <Home />}</HostContext.Provider>
  );
}
