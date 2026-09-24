"use client";
import { useEffect, useState } from "react";
import { HostSession } from "../../../games/fencing/host/host-session";
import { useHostStore } from "../../../games/fencing/host/host-store";
import { Landing } from "./Landing";
import { SessionContext } from "./session-context";
import { Stage } from "../../../games/fencing/host/components/Stage";

/** The computer's side of Standoff: start a game, fill the lobby, host the match. */
export function HostApp() {
  // This component only renders in the browser (see HostEntry), so the session can be made up front.
  const [session] = useState(() => new HostSession());
  const screen = useHostStore((state) => state.screen);

  useEffect(() => {
    session.connect();
    return () => session.dispose();
  }, [session]);

  return (
    <SessionContext.Provider value={session}>
      {screen === "landing" ? <Landing /> : <Stage />}
    </SessionContext.Provider>
  );
}
