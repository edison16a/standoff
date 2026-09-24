"use client";
import { useEffect, useState } from "react";
import { HostSession } from "../host-session";
import { useHostStore } from "../host-store";
import { Landing } from "./Landing";
import { LobbyScreen } from "./LobbyScreen";
import { MatchScreen } from "./match/MatchScreen";
import { SessionContext } from "./session-context";

/** The computer's side of Standoff: start a game, fill the lobby, host the match. */
export function HostApp() {
  // Created after mount: the session opens sockets and audio, which only exist in the browser.
  const [session, setSession] = useState<HostSession | null>(null);
  const screen = useHostStore((state) => state.screen);

  useEffect(() => {
    const created = new HostSession();
    created.connect();
    setSession(created);
    return () => created.dispose();
  }, []);

  if (!session) return null;
  return (
    <SessionContext.Provider value={session}>
      {screen === "landing" && <Landing />}
      {screen === "lobby" && <LobbyScreen />}
      {screen === "match" && <MatchScreen />}
    </SessionContext.Provider>
  );
}
